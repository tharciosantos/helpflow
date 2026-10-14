import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { updateTicketStatusSchema, updateTicketSchema } from '@/lib/schemas';
import { checkRateLimit, buildRateLimitHeaders } from '@/lib/rateLimiter';
import { buildHistoryEntries } from '@/lib/ticketHistory';
import { computeDueAt } from '@/lib/sla';
import {
  canDeleteTicket,
  canEditTicketContent,
  canViewTicket,
  getForbiddenTicketFields,
} from '@/lib/ticketAuthorization';

// FUNÇÃO GET
export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }
  try {

    const { id } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, email: true, image: true, role: true } },
        agent: { select: { id: true, name: true, email: true, image: true, role: true } },
        comments: {
          // Notas internas: só AGENT enxerga. CLIENT recebe apenas PUBLIC.
          where: session.user.role === 'AGENT' ? {} : { visibility: 'PUBLIC' },
          include: {
            author: { select: { id: true, name: true, email: true, image: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        histories: {
          include: {
            actor: { select: { id: true, name: true, email: true, image: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      console.warn(`[ticket GET] Ticket not found for id=${id}`);
      return NextResponse.json({ message: 'Ticket não encontrado' }, { status: 404 });
    }

    if (!canViewTicket(session.user, ticket)) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
    }

    return NextResponse.json(ticket, { status: 200 });
  } catch (error) {
    console.error('Erro ao buscar o ticket:', error);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}

// FUNÇÃO PATCH - atualização parcial (status, title, description, priority)
export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  const { isLimited, remaining, resetTime } = await checkRateLimit(`ticket:update:${session.user.id}`, { maxRequests: 30 });
  if (isLimited) {
    return NextResponse.json(
      { message: "Muitas requisições. Tente novamente mais tarde." },
      { status: 429, headers: buildRateLimitHeaders({ remaining, resetTime }) }
    );
  }

  const { id } = await params;

  try {
    const body = await req.json();

    const ticket = await prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return NextResponse.json({ message: 'Ticket não encontrado' }, { status: 404 });
    }

    if (!canEditTicketContent(session.user, ticket)) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
    }

    const forbiddenFields = getForbiddenTicketFields(session.user, body);
    if (forbiddenFields.length > 0) {
      return NextResponse.json(
        { message: 'Apenas agentes podem alterar status, prioridade ou responsável.' },
        { status: 403 }
      );
    }

    let data;

    if (body.status !== undefined && body.title === undefined && body.description === undefined && body.priority === undefined && body.agentId === undefined) {
      const validation = updateTicketStatusSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { message: 'Dados inválidos.', errors: validation.error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      data = { status: validation.data.status };
    } else {
      const validation = updateTicketSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { message: 'Dados inválidos.', errors: validation.error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      data = {};
      if (validation.data.title !== undefined) data.title = validation.data.title;
      if (validation.data.description !== undefined) data.description = validation.data.description;
      if (validation.data.status !== undefined) data.status = validation.data.status;
      if (validation.data.priority !== undefined) data.priority = validation.data.priority;
      if (validation.data.agentId !== undefined) data.agentId = validation.data.agentId;
    }

    if (data.agentId) {
      const companyFilter = ticket.companyId ? { companyId: ticket.companyId } : {};
      const assignedMember = await prisma.user.findFirst({
        where: { id: data.agentId, ...companyFilter },
        select: { id: true },
      });
      if (!assignedMember) {
        return NextResponse.json({ message: 'Membro selecionado inválido.' }, { status: 400 });
      }
    }
    // SLA - prazo e resolução derivados do estado do ticket:
    // 1) Se a prioridade mudou, recalculamos o prazo a partir de AGORA.
    // 2) Se fechou, gravamos resolvedAt; se reabriu, limpamos resolvedAt.
    if (data.priority !== undefined && data.priority !== ticket.priority) {
      data.dueAt = computeDueAt(data.priority);
    }
    if (data.status === 'CLOSED' && ticket.status !== 'CLOSED') {
      data.resolvedAt = new Date();
    }
    if (data.status && data.status !== 'CLOSED' && ticket.status === 'CLOSED') {
      data.resolvedAt = null;
    }



    const updatedTicket = await prisma.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: { id },
        data,
        include: {
          author: { select: { id: true, name: true, email: true, image: true } },
          agent: { select: { id: true, name: true, email: true, image: true } },
        },
      });

      // Auditoria: registra diffs reais na mesma transação (atomicidade).
      const entries = buildHistoryEntries({ ticket, data, actorId: session.user.id });
      if (entries.length > 0) {
        await tx.ticketHistory.createMany({ data: entries });
      }

      return updated;
    });

    return NextResponse.json(updatedTicket, { status: 200 });

  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Ticket não encontrado' }, { status: 404 });
    }
    console.error('Erro ao atualizar o ticket:', error);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    // 401 = sem identidade (não logado)
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  const { isLimited, remaining, resetTime } = await checkRateLimit(`ticket:delete:${session.user.id}`, { maxRequests: 10 });
  if (isLimited) {
    return NextResponse.json(
      { message: "Muitas requisições. Tente novamente mais tarde." },
      { status: 429, headers: buildRateLimitHeaders({ remaining, resetTime }) }
    );
  }

  const { id } = await params;

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return NextResponse.json({ message: 'Ticket não encontrado' }, { status: 404 });
    }

    if (!canDeleteTicket(session.user, ticket)) {
      return NextResponse.json({ message: 'Não autorizado a excluir este ticket' }, { status: 403 });
    }

    await prisma.ticket.delete({
      where: { id },
    });

    return new Response(null, { status: 204 });

  } catch (error) {
    console.error("Erro ao deletar o ticket:", error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Ticket não encontrado para exclusão' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}
