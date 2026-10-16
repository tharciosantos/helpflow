import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from '@/lib/prisma';
import { createTicketSchema } from '@/lib/schemas';
import { checkRateLimit, buildRateLimitHeaders } from '@/lib/rateLimiter';
import { computeDueAt } from '@/lib/sla';
import {
  averageFirstResponseMs,
  averageResolutionMs,
  METRICS_SAMPLE_LIMIT,
} from '@/lib/metrics';

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  const { isLimited, remaining, resetTime } = await checkRateLimit(`ticket:create:${session.user.id}`, { maxRequests: 10 });
  if (isLimited) {
    return NextResponse.json(
      { message: "Muitas requisições. Tente novamente mais tarde." },
      { status: 429, headers: buildRateLimitHeaders({ remaining, resetTime }) }
    );
  }

  try {
    const body = await req.json();

    // Validação com Zod - retorna erros detalhados automaticamente
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
    // Extraímos priority também - se não vier no body, o banco usa o default (MEDIUM)
    const { title, description, priority } = validation.data;
    const authorId = session.user.id;
    const companyId = session.user.companyId || null;

    // SLA: se a prioridade não vier no body, tratamos como MEDIUM para calcular
    // o prazo de forma consistente com o @default do schema.
    const effectivePriority = priority || 'MEDIUM';
    const dueAt = computeDueAt(effectivePriority);

    const newTicket = await prisma.ticket.create({
      data: { title, description, priority, authorId, companyId, dueAt },
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
    const companyId = session.user.companyId;

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
    const onlyOverdue = searchParams.get('overdue') === 'true';
    const onlyMine = searchParams.get('mine') === 'true';
    const sort = searchParams.get('sort') === 'dueDate' ? 'dueDate' : 'recent';
    const validStatuses = ['OPEN', 'IN_PROGRESS', 'CLOSED'];
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

    // Isolamento multi-empresa: AGENT vê todos da sua empresa; CLIENT vê os que criou ou onde é responsável
    const baseVisibility = {
      ...(companyId ? { companyId } : {}),
      ...(role !== 'AGENT'
        ? {
            OR: [
              { authorId: session.user.id },
              { agentId: session.user.id },
            ],
          }
        : {}),
    };

    // AND separado: "só atrasados" usa status: { not: 'CLOSED' }, que
    // sobrescreveria o filtro simples de status no mesmo objeto.
    const andConditions = [];

    if (baseVisibility.OR) andConditions.push({ OR: baseVisibility.OR });

    if (search) {
      andConditions.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (onlyOverdue) {
      andConditions.push({ dueAt: { lt: new Date() }, status: { not: 'CLOSED' } });
    }

    if (onlyMine) {
      andConditions.push(
        role === 'AGENT' ? { agentId: session.user.id } : { authorId: session.user.id }
      );
    }

    const where = {
      ...(companyId ? { companyId } : {}),
      ...(validStatuses.includes(status) ? { status } : {}),
      ...(validPriorities.includes(priority) ? { priority } : {}),
      ...(andConditions.length > 0 ? { AND: andConditions } : {}),
    };

    // dueDate: prazo mais próximo primeiro, sem prazo no fim da lista.
    const orderBy = sort === 'dueDate'
      ? [{ dueAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }]
      : [{ createdAt: 'desc' }];

    // KPIs ignoram os filtros da lista para não mudar a cada busca.
    const metricsScope = {
      ...(companyId ? { companyId } : {}),
      ...(baseVisibility.OR ? { OR: baseVisibility.OR } : {}),
    };

    const [
      tickets,
      total,
      openCount,
      inProgressCount,
      closedCount,
      overdueCount,
      resolutionSample,
      firstResponseSample,
    ] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          author: { select: { id: true, name: true, email: true, image: true } },
          agent: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.ticket.count({ where }),
      prisma.ticket.count({ where: { ...baseVisibility, status: 'OPEN' } }),
      prisma.ticket.count({ where: { ...baseVisibility, status: 'IN_PROGRESS' } }),
      prisma.ticket.count({ where: { ...baseVisibility, status: 'CLOSED' } }),
      prisma.ticket.count({
        where: { ...metricsScope, dueAt: { lt: new Date() }, status: { not: 'CLOSED' } },
      }),
      prisma.ticket.findMany({
        where: { ...metricsScope, resolvedAt: { not: null } },
        select: { createdAt: true, resolvedAt: true },
        orderBy: { resolvedAt: 'desc' },
        take: METRICS_SAMPLE_LIMIT,
      }),
      prisma.ticket.findMany({
        where: { ...metricsScope, firstResponseAt: { not: null } },
        select: { createdAt: true, firstResponseAt: true },
        orderBy: { firstResponseAt: 'desc' },
        take: METRICS_SAMPLE_LIMIT,
      }),
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
        overdue: overdueCount,
        // Médias em ms; o front formata com formatDuration().
        avgResolutionMs: averageResolutionMs(resolutionSample),
        avgFirstResponseMs: averageFirstResponseMs(firstResponseSample),
        resolvedSample: resolutionSample.length,
        firstResponseSample: firstResponseSample.length,
      },
    }, { status: 200 });

  } catch (error) {
    console.error("Erro ao buscar os tickets:", error);
    return NextResponse.json({ message: "Erro interno do servidor" }, { status: 500 });
  }
}
