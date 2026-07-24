import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';
import { createTicketSchema } from '@/lib/schemas';
import { checkRateLimit } from '@/lib/rateLimiter';

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  const { isLimited, remaining } = checkRateLimit(`ticket:create:${session.user.id}`, { maxRequests: 10 });
  if (isLimited) {
    return NextResponse.json({ message: "Muitas requisições. Tente novamente mais tarde." }, { status: 429 });
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

    // validation.data já tem os campos limpos e validados pelo Zod
    // Extraímos priority também — se não vier no body, o banco usa o default (MEDIUM)
    const { title, description, priority } = validation.data;
    const authorId = session.user.id;

    const newTicket = await prisma.ticket.create({
      data: { title, description, priority, authorId },
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
    const requestedPage = parseInt(searchParams.get('page') || '1', 10);
    const requestedLimit = parseInt(searchParams.get('limit') || '10', 10);
    const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(50, Math.max(1, requestedLimit))
      : 10;
    const skip = (page - 1) * limit;

    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search')?.trim();
    const validStatuses = ['OPEN', 'IN_PROGRESS', 'CLOSED'];
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

    const visibilityFilter = role === 'AGENT' ? {} : { authorId: session.user.id };
    const where = {
      ...visibilityFilter,
      ...(validStatuses.includes(status) ? { status } : {}),
      ...(validPriorities.includes(priority) ? { priority } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // Buscar tickets E totais em paralelo
    const [tickets, total, openCount, inProgressCount, closedCount] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          author: { select: { id: true, name: true, email: true, image: true } },
          agent: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.ticket.count({ where }),
      prisma.ticket.count({ where: { ...visibilityFilter, status: 'OPEN' } }),
      prisma.ticket.count({ where: { ...visibilityFilter, status: 'IN_PROGRESS' } }),
      prisma.ticket.count({ where: { ...visibilityFilter, status: 'CLOSED' } }),
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
      summary: {
        total: openCount + inProgressCount + closedCount,
        open: openCount,
        inProgress: inProgressCount,
        closed: closedCount,
      },
    }, { status: 200 });

  } catch (error) {
    console.error("Erro ao buscar os tickets:", error);
    return NextResponse.json({ message: "Erro interno do servidor" }, { status: 500 });
  }
}
