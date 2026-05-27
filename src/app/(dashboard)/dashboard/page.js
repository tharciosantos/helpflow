'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from "next-auth/react";
import TicketList from "../../components/TicketList";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchTickets = async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets?page=${page}&limit=10`);
      if (!res.ok) throw new Error('Falha ao carregar tickets.');

      const data = await res.json();
      setTickets(data.tickets);
      setTotalPages(data.pagination.totalPages);
      setCurrentPage(data.pagination.page);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTickets();
    }
  }, [status]);

  const handleTicketDeleted = (deletedTicketId) => {
    setTickets(prev => prev.filter(ticket => ticket.id !== deletedTicketId));
  };

  const handleTicketUpdated = (updatedTicket) => {
    setTickets(prev =>
      prev.map(ticket =>
        ticket.id === updatedTicket.id ? updatedTicket : ticket
      )
    );
  };

  const totalTickets = tickets.length;
  const openTickets = tickets.filter(t => t.status === 'OPEN').length;
  const inProgressTickets = tickets.filter(t => t.status === 'IN_PROGRESS').length;

  return (
    <div className="space-y-8">
      {/* Cabeçalho / boas-vindas */}
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Olá, {session?.user?.name || 'bem-vindo(a)'} 👋
          </h1>
          <p className="mt-2 text-gray-400 text-sm md:text-base">
            Organize e acompanhe os tickets do seu suporte em um só lugar.
          </p>
        </div>

        <Link
          data-cy="dashboard-new-ticket-link"
          href="/dashboard/tickets/new"
          className="inline-flex items-center justify-center rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-teal-400 transition"
        >
          + Novo ticket
        </Link>
      </header>

      {/* Resumo rápido + lista */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        {/* Lista de tickets + controles de paginação */}
        <div className="flex flex-col gap-4">
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 md:p-6 shadow-lg">
            <TicketList
              tickets={tickets}
              loading={loading}
              error={error}
              onTicketDeleted={handleTicketDeleted}
              onTicketUpdated={handleTicketUpdated}
              session={session}
            />
          </div>

          {/* Paginação — só aparece quando há mais de 1 página */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 py-2">
              <button
                data-cy="pagination-prev"
                onClick={() => fetchTickets(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-md bg-gray-700 text-white text-sm disabled:opacity-40 hover:bg-gray-600 transition"
              >
                ← Anterior
              </button>
              <span className="text-sm text-gray-400">
                Página {currentPage} de {totalPages}
              </span>
              <button
                data-cy="pagination-next"
                onClick={() => fetchTickets(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-md bg-gray-700 text-white text-sm disabled:opacity-40 hover:bg-gray-600 transition"
              >
                Próxima →
              </button>
            </div>
          )}
        </div>

        {/* Painel lateral com resumo e dicas */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-gray-800 bg-gray-900/80 p-4 shadow-md">
            <h2 className="text-sm font-semibold text-gray-200 mb-3">
              Resumo dos tickets
            </h2>
            <div className="space-y-2 text-sm">
              <p className="flex justify-between text-gray-300">
                <span>Total</span>
                <span className="font-semibold text-white">{totalTickets}</span>
              </p>
              <p className="flex justify-between text-gray-300">
                <span>Abertos</span>
                <span className="font-semibold text-green-400">{openTickets}</span>
              </p>
              <p className="flex justify-between text-gray-300">
                <span>Em progresso</span>
                <span className="font-semibold text-yellow-300">{inProgressTickets}</span>
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 text-sm text-gray-300 leading-relaxed">
            <h3 className="text-sm font-semibold text-gray-100 mb-2">
              Dica rápida
            </h3>
            <p>
              Use os status <span className="font-semibold">Aberto</span>,{' '}
              <span className="font-semibold">Em Progresso</span> e{' '}
              <span className="font-semibold">Fechado</span> para organizar o fluxo de trabalho.
              Mantenha o título claro e a descrição detalhada para facilitar o atendimento.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}

