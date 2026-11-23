import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { partitionNotificationsByAccess, remainingUnreadCount } from "@/lib/notificationAccess";

// GET /api/notifications - lista as notificacoes do usuario logado (nao lidas primeiro)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  try {
    // AUD-42: a notificação só continua no sino enquanto o usuário ainda pode
    // abrir o chamado. Atribuir é permitido a qualquer membro da empresa (até
    // CLIENT), e a reatribuição deixa a notificação ASSIGNED antiga para trás;
    // o link "Abrir chamado →" cairia em 403. A acessibilidade atual vem do
    // estado no banco (agentId), a mesma decisão de GET /api/tickets/[id].
    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      // Não lidas (readAt NULL) primeiro, depois as mais recentes.
      // No Postgres, ASC coloca NULLS LAST por padrão — por isso o
      // `nulls: "first"` explícito. O cliente também reordena por
      // segurança (ver sortNotifications).
      orderBy: [{ readAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
      include: {
        ticket: {
          select: { id: true, title: true, status: true, authorId: true, agentId: true, companyId: true },
        },
      },
    });

    // O filtro vem antes do limite: notificações inacessíveis não consomem as
    // 30 posições — sem isso, avisos de outros chamados sumiriam da lista.
    const tickets = new Map(
      notifications.filter((n) => n.ticket).map((n) => [n.ticket.id, n.ticket])
    );
    const { visible } = partitionNotificationsByAccess(session.user, notifications, tickets);

    if (visible.length === notifications.length) {
      // Caso comum (nada filtrado): a contagem resolve no banco.
      const unreadCount = await prisma.notification.count({
        where: { userId: session.user.id, readAt: null },
      });
      return NextResponse.json({ notifications: visible, unreadCount }, { status: 200 });
    }

    // Só o que está na resposta pode ser contado como não lido — senão o
    // contador do sino apontaria para itens que o painel nunca exibe.
    const unreadCount = remainingUnreadCount(visible);

    return NextResponse.json({ notifications: visible, unreadCount }, { status: 200 });
  } catch (error) {
    console.error("Erro ao buscar notificações:", error);
    return NextResponse.json({ message: "Erro interno do servidor" }, { status: 500 });
  }
}

// PATCH /api/notifications - marca TODAS as notificações do usuário como lidas.
// O GET devolve no máximo 30 itens; o "Ler todas" precisa atingir também as
// antigas que não estão na lista (por isso o updateMany, não N requests).
export async function PATCH() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  try {
    const result = await prisma.notification.updateMany({
      where: { userId: session.user.id, readAt: null },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ updated: result.count }, { status: 200 });
  } catch (error) {
    console.error("Erro ao marcar todas as notificações como lidas:", error);
    return NextResponse.json({ message: "Erro interno do servidor" }, { status: 500 });
  }
}
