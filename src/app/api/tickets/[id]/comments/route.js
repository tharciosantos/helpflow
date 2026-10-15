import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { createCommentSchema } from '@/lib/schemas';
import { checkRateLimit, buildRateLimitHeaders } from '@/lib/rateLimiter';
import { canCommentOnTicket, canViewTicket } from '@/lib/ticketAuthorization';
import { resolveNotificationRecipients, buildNotificationMessage } from '@/lib/notifications';

// GET /api/tickets/[id]/comments - Lista os comentários do chamado
export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        agentId: true,
        companyId: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ message: 'Ticket não encontrado' }, { status: 404 });
    }

    if (!canViewTicket(session.user, ticket)) {
      return NextResponse.json({ message: 'Acesso negado' }, { status: 403 });
    }

    const comments = await prisma.ticketComment.findMany({
      where: {
        ticketId: id,
        // CLIENT nunca recebe INTERNAL, mesmo chamando a rota direta.
        ...(session.user.role === 'AGENT' ? {} : { visibility: 'PUBLIC' }),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(comments, { status: 200 });
  } catch (error) {
    console.error('Erro ao listar comentários:', error);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST /api/tickets/[id]/comments - Adiciona novo comentário ao chamado
export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  const { isLimited, remaining, resetTime } = await checkRateLimit(`comment:create:${session.user.id}`, { maxRequests: 20 });
  if (isLimited) {
    return NextResponse.json(
      { message: 'Muitas mensagens enviadas. Aguarde um instante.' },
      { status: 429, headers: buildRateLimitHeaders({ remaining, resetTime }) }
    );
  }

  try {
    const { id } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        agentId: true,
        companyId: true,
        status: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ message: 'Ticket não encontrado' }, { status: 404 });
    }

    if (!canCommentOnTicket(session.user, ticket)) {
      return NextResponse.json({ message: 'Você não tem permissão para comentar neste chamado.' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createCommentSchema.safeParse(body);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || 'Dados inválidos.';
      return NextResponse.json({ message: errorMsg }, { status: 400 });
    }

    // Notas internas são privilégio de AGENT (defesa em profundidade além do schema).
    if (parsed.data.visibility === 'INTERNAL' && session.user.role !== 'AGENT') {
      return NextResponse.json(
        { message: 'Apenas agentes podem criar notas internas.' },
        { status: 403 }
      );
    }

    const newComment = await prisma.$transaction(async (tx) => {
      const created = await tx.ticketComment.create({
        data: {
          content: parsed.data.content,
          visibility: parsed.data.visibility,
          ticketId: id,
          authorId: session.user.id,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
            },
          },
        },
      });

      // Mantém o ticket no topo das listas ordenadas por atualização
      await tx.ticket.update({
        where: { id },
        data: { updatedAt: new Date() },
      });

      // Notificacao in-app: apenas comentarios PUBLICOS notificam o outro lado.
      // Notas internas (INTERNAL) sao alinhamento da TI e nao geram sino.
      if (parsed.data.visibility !== 'INTERNAL') {
        const recipients = resolveNotificationRecipients({
          event: 'COMMENT',
          actor: { id: session.user.id, role: session.user.role },
          ticket,
        });
        if (recipients.length > 0) {
          await tx.notification.createMany({
            data: recipients.map((userId) => ({
              userId,
              ticketId: id,
              type: 'COMMENT',
              message: buildNotificationMessage({
                event: 'COMMENT', actorName: session.user.name, ticketTitle: null,
              }),
            })),
          });
        }
      }

      return created;
    });

    return NextResponse.json(newComment, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar comentário:', error);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}
