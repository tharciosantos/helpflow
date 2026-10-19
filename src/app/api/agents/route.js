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
    // Sem empresa não existe diretório de membros: devolve apenas o próprio
    // usuário (nunca a lista global, que vazaria usuários de outros tenants).
    if (!session.user.companyId) {
      const self = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, name: true, email: true, role: true },
      });
      return NextResponse.json(self ? [self] : []);
    }

    const members = await prisma.user.findMany({
      where: { companyId: session.user.companyId },
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ role: 'asc' }, { name: 'asc' }, { email: 'asc' }],
    });
    return NextResponse.json(members);
  } catch (error) {
    console.error('Erro ao buscar agentes:', error);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}
