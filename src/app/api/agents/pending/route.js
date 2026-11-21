import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/agents/pending — contas criadas por código de empresa que aguardam
// aprovação. Só o AGENT da própria empresa enxerga (AUD-37).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  if (session.user.role !== 'AGENT') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }

  try {
    if (!session.user.companyId) {
      return NextResponse.json([]);
    }

    const pending = await prisma.user.findMany({
      where: {
        companyId: session.user.companyId,
        approvalStatus: 'PENDING',
        role: 'CLIENT',
      },
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(pending);
  } catch (error) {
    console.error('Erro ao buscar contas pendentes:', error);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}
