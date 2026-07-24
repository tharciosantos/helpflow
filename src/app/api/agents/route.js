import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  if (session.user.role !== 'AGENT') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }

  try {
    const agents = await prisma.user.findMany({
      where: { role: 'AGENT' },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
    });
    return NextResponse.json(agents);
  } catch (error) {
    console.error('Erro ao buscar agentes:', error);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}
