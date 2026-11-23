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
    // (A query não leva `take`: o limite é aplicado na lista já filtrada.)
    const tickets = new Map(
      notifications.filter((n) => n.ticket).map((n) => [n.ticket.id, n.ticket])
    );
    const { visible: accessible } = partitionNotificationsByAccess(
      session.user,
      notifications,
      tickets
    );
    // AUD-43: o `take: 30` acima vale para o que o sino exibe desde sempre; a
    // AUD-42 removeu o `take` por engano, então o GET devolvia a lista inteira
    // e o "Ler todas" (updateMany) não tinha como ser exercitado além da janela.
    const visible = accessible.slice(0, 30);

    // O contador completo passa da lista de 30: é ele que mostra quantos avisos
    // o "Ler todas" vai alcançar (e convida a clicar). O contador só inclui o
    // que a lista pode exibir: um aviso inacessível nunca acende o badge.
    const unreadCount =
      accessible.length === notifications.length
        ? // Caso comum (nada filtrado): a contagem resolve no banco.
          await prisma.notification.count({
            where: { userId: session.user.id, readAt: null },
          })
        : remainingUnreadCount(visible);

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
