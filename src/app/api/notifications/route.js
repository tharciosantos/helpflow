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
        orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
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
