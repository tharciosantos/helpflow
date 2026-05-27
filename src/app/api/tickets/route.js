import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import prisma from '@/lib/prisma';
import { createTicketSchema } from '@/lib/schemas';

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Validação com Zod — retorna erros detalhados automaticamente
    const validation = createTicketSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          message: 'Dados inválidos.',
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { title, description } = validation.data;
    const authorId = session.user.id;

    const newTicket = await prisma.ticket.create({
      data: { title, description, authorId },
    });

    return NextResponse.json(newTicket, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar o ticket:", error);
    return NextResponse.json({ message: "Erro interno do servidor" }, { status: 500 });
  }
}

// --- FUNÇÃO PARA LER OS TICKETS ---

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  try {
    const role = session.user.role || 'CLIENT';

    // Ler parâmetros de paginação da URL
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const skip = (page - 1) * limit;

    const where = role === 'AGENT' ? {} : { authorId: session.user.id };

    // Buscar tickets E total em paralelo
    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: { author: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.ticket.count({ where }),
    ]);

    return NextResponse.json({
      tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    }, { status: 200 });

  } catch (error) {
    console.error("Erro ao buscar os tickets:", error);
    return NextResponse.json({ message: "Erro interno do servidor" }, { status: 500 });
  }
}
