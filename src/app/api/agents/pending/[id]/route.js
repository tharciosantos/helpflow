import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { canApproveUser, getApprovalDenial, getApprovalUpdate } from '@/lib/approval';

const approvalSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT'], { error: 'Ação inválida.' }),
}).strict();

// PATCH /api/agents/pending/[id] — aprova ou recusa uma conta PENDING.
export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  if (session.user.role !== 'AGENT') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Dados inválidos.' }, { status: 400 });
  }

  const parsed = approvalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Dados inválidos.', errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const { id } = await params;
    // Escopo do tenant já no filtro: id de outra empresa nem é carregado.
    const target = session.user.companyId
      ? await prisma.user.findFirst({
        where: { id, companyId: session.user.companyId },
        select: { id: true, role: true, companyId: true, approvalStatus: true },
      })
      : null;

    const denial = getApprovalDenial(session.user, target);
    if (denial) {
      return NextResponse.json({ message: denial.message }, { status: denial.status });
    }

    if (!canApproveUser(session.user, target)) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
    }

    // updateMany condicionado a PENDING: duas decisões simultâneas não se
    // sobrescrevem (a segunda encontra count 0 e responde 409).
    const result = await prisma.user.updateMany({
      where: { id, companyId: session.user.companyId, approvalStatus: 'PENDING' },
      data: { approvalStatus: getApprovalUpdate(parsed.data.action) },
    });

    if (result.count === 0) {
      return NextResponse.json({ message: 'Esta conta já foi analisada.' }, { status: 409 });
    }

    return NextResponse.json({ id, approvalStatus: getApprovalUpdate(parsed.data.action) });
  } catch (error) {
    console.error('Erro ao decidir aprovação:', error);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}
