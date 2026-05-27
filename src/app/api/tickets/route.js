import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import prisma from '@/lib/prisma';

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { message: "Não autorizado" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { title, description } = body;

    // Validação de campos obrigatórios
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { message: 'O título é obrigatório.' },
        { status: 400 }
      );
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json(
        { message: 'A descrição é obrigatória.' },
        { status: 400 }
      );
    }

    // Limites de tamanho
    if (title.trim().length < 5) {
      return NextResponse.json(
        { message: 'O título deve ter pelo menos 5 caracteres.' },
        { status: 400 }
      );
    }

    if (title.trim().length > 100) {
      return NextResponse.json(
        { message: 'O título não pode ter mais de 100 caracteres.' },
        { status: 400 }
      );
    }

    if (description.trim().length > 2000) {
      return NextResponse.json(
        { message: 'A descrição não pode ter mais de 2000 caracteres.' },
        { status: 400 }
      );
    }

    const authorId = session.user.id;

    const newTicket = await prisma.ticket.create({
      data: {
        title: title.trim(),       // ✅ Salva sem espaços nas bordas
        description: description.trim(),
        authorId,
      },
    });

    return NextResponse.json(newTicket, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar o ticket:", error);
    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 }
    );
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
