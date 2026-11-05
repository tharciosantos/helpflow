import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { canDeleteComment } from '@/lib/ticketAuthorization';

// DELETE /api/tickets/[id]/comments/[commentId] - Remove um comentário
export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { id, commentId } = await params;

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
      return NextResponse.json({ message: 'Chamado não encontrado' }, { status: 404 });
    }

    const comment = await prisma.ticketComment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.ticketId !== id) {
      return NextResponse.json({ message: 'Comentário não encontrado' }, { status: 404 });
    }

    if (!canDeleteComment(session.user, comment, ticket)) {
      return NextResponse.json({ message: 'Você não tem permissão para excluir este comentário.' }, { status: 403 });
    }

    await prisma.ticketComment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ message: 'Comentário excluído com sucesso' }, { status: 200 });
  } catch (error) {
    console.error('Erro ao excluir comentário:', error);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}
