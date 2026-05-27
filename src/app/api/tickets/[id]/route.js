import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { updateTicketStatusSchema, updateTicketSchema } from '@/lib/schemas';

// FUNÇÃO GET
export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }
  try {

    const { id } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { author: true },
    });

    if (!ticket) {
      console.warn(`[ticket GET] Ticket not found for id=${id}`);
      return NextResponse.json({ message: 'Ticket não encontrado' }, { status: 404 });
    }

    const role = session.user.role || 'CLIENT';
    const isOwner = ticket.authorId === session.user.id;
    const isAgent = role === 'AGENT';

    if (!isOwner && !isAgent) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
    }

    return NextResponse.json(ticket, { status: 200 });
  } catch (error) {
    console.error('Erro ao buscar o ticket:', error);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}

// FUNÇÃO PATCH 
export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    // 401 = sem identidade (não logado). 403 seria "logado mas sem permissão".
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();

    // Validação com Zod — substitui o if manual de status
    // updateTicketStatusSchema aceita apenas 'OPEN' | 'IN_PROGRESS' | 'CLOSED'
    const validation = updateTicketStatusSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: 'Dados inválidos.', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { status } = validation.data;

    // Verifica se o ticket existe
    const ticket = await prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return NextResponse.json({ message: 'Ticket não encontrado' }, { status: 404 });
    }

    // Verifica dono ou role de AGENT
    const role = session.user.role || 'CLIENT';
    const isOwner = ticket.authorId === session.user.id;
    const isAgent = role === 'AGENT';

    if (!isOwner && !isAgent) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
    }

    // Atualiza
    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updatedTicket, { status: 200 });

  } catch (error) {
    console.error("Erro ao atualizar o ticket:", error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Ticket não encontrado para atualização' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}


// FUNÇÃO PUT
export async function PUT(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();

    // Validação com Zod — title e description são opcionais no PUT
    // (o usuário pode querer atualizar só o título, ou só a descrição)
    const validation = updateTicketSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: 'Dados inválidos.', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, description } = validation.data;
    const ticket = await prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return NextResponse.json({ message: 'Ticket não encontrado' }, { status: 404 });
    }

    const role = session.user.role || 'CLIENT';
    const isOwner = ticket.authorId === session.user.id;
    const isAgent = role === 'AGENT';

    if (!isOwner && !isAgent) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: { title, description },
    });

    return NextResponse.json(updatedTicket, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    // 401 = sem identidade (não logado)
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await params;
  console.log("Deletando ticket:", id);

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return NextResponse.json({ message: 'Ticket não encontrado' }, { status: 404 });
    }

    const role = session.user.role || 'CLIENT';
    const isOwner = ticket.authorId === session.user.id;
    const isAgent = role === 'AGENT';

    if (!isOwner && !isAgent) {
      return NextResponse.json({ message: 'Não autorizado a excluir este ticket' }, { status: 403 });
    }

    await prisma.ticket.delete({
      where: { id },
    });

    return new Response(null, { status: 204 });

  } catch (error) {
    console.error("Erro ao deletar o ticket:", error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Ticket não encontrado para exclusão' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}
