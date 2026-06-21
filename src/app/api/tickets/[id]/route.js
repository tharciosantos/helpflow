import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { updateTicketStatusSchema, updateTicketSchema } from '@/lib/schemas';
import { checkRateLimit } from '@/lib/rateLimiter';

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
      include: { author: true },
    });

    if (!ticket) {
      console.warn(`[ticket GET] Ticket not found for id=${id}`);
      return NextResponse.json({ message: 'Ticket não encontrado' }, { status: 404 });
    }

    const role = session.user.role || 'CLIENT';
    const isOwner = ticket.authorId === session.user.id;
    const isAgent = role === 'AGENT';

    if (!isOwner && !isAgent) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
    }

    return NextResponse.json(ticket, { status: 200 });
  } catch (error) {
    console.error('Erro ao buscar o ticket:', error);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}

// FUNÇÃO PATCH — atualização parcial (status, title, description, priority)
export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  const { isLimited } = checkRateLimit(`ticket:update:${session.user.id}`, { maxRequests: 30 });
  if (isLimited) {
    return NextResponse.json({ message: "Muitas requisições. Tente novamente mais tarde." }, { status: 429 });
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

    const role = session.user.role || 'CLIENT';
    const isOwner = ticket.authorId === session.user.id;
    const isAgent = role === 'AGENT';

    if (!isOwner && !isAgent) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
    }

    let data;

    if (body.status !== undefined && body.title === undefined && body.description === undefined && body.priority === undefined) {
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
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data,
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

  const { isLimited } = checkRateLimit(`ticket:delete:${session.user.id}`, { maxRequests: 10 });
  if (isLimited) {
    return NextResponse.json({ message: "Muitas requisições. Tente novamente mais tarde." }, { status: 429 });
  }

  const { id } = await params;

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return NextResponse.json({ message: 'Ticket não encontrado' }, { status: 404 });
    }

    const role = session.user.role || 'CLIENT';
    const isOwner = ticket.authorId === session.user.id;
    const isAgent = role === 'AGENT';

    if (!isOwner && !isAgent) {
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
