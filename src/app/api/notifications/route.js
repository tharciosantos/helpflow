import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/notifications - lista as notificacoes do usuario logado (nao lidas primeiro)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  try {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: session.user.id },
        // Não lidas (readAt NULL) primeiro, depois as mais recentes.
        // No Postgres, ASC coloca NULLS LAST por padrão — por isso o
        // `nulls: "first"` explícito. O cliente também reordena por
        // segurança (ver sortNotifications).
        orderBy: [{ readAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
        take: 30,
        include: {
          ticket: { select: { id: true, title: true, status: true } },
        },
      }),
      prisma.notification.count({
        where: { userId: session.user.id, readAt: null },
      }),
    ]);

    return NextResponse.json({ notifications, unreadCount }, { status: 200 });
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
