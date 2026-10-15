import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// PATCH /api/notifications/[id] - marca uma notificacao como lida.
// So o proprio destinatario pode marcar (updateMany com filtro de userId garante
// que uma requisicao maliciosa para o id de outro usuario nao surta efeito).
export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const result = await prisma.notification.updateMany({
      where: { id, userId: session.user.id, readAt: null },
      data: { readAt: new Date() },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { message: "Notificação não encontrada ou já lida" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Erro ao marcar notificação como lida:", error);
    return NextResponse.json({ message: "Erro interno do servidor" }, { status: 500 });
  }
}
