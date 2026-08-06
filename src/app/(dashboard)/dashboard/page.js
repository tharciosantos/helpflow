'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [totalCount, setTotalCount] = useState(0);
  const [summaryTotal, setSummaryTotal] = useState(0);
  const [openCount, setOpenCount] = useState(0);
  const [inProgressCount, setInProgressCount] = useState(0);
  const [closedCount, setClosedCount] = useState(0);
  const [filters, setFilters] = useState({ search: '', status: '', priority: '' });
  const [agents, setAgents] = useState([]);

  const fetchTickets = useCallback(async (page = 1, activeFilters = {}) => {
    setLoading(true);
    setError('');
    try {
      const { search = '', status = '', priority = '' } = activeFilters;
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('status', status);
      if (priority) params.set('priority', priority);

      const res = await fetch(`/api/tickets?${params.toString()}`);
      if (!res.ok) throw new Error('Falha ao carregar tickets.');

      const data = await res.json();
      setTickets(data.tickets);
      setTotalPages(data.pagination.totalPages);
      setCurrentPage(data.pagination.page);
      setTotalCount(data.pagination.total);
      setSummaryTotal(data.summary.total);
      setOpenCount(data.summary.open);
      setInProgressCount(data.summary.inProgress);
      setClosedCount(data.summary.closed);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTickets(1, {});
    }
  }, [status, fetchTickets]);

  useEffect(() => {
    if (status !== 'authenticated' || session?.user?.role !== 'AGENT') return;

    const fetchAgents = async () => {
      try {
        const response = await fetch('/api/agents');
        if (!response.ok) throw new Error('Falha ao carregar agentes.');
        setAgents(await response.json());
      } catch (err) {
        console.error(err.message);
      }
    };

    fetchAgents();
  }, [status, session?.user?.role]);

  const handleTicketDeleted = (deletedTicketId, deletedStatus) => {
    setTickets(prev => prev.filter(ticket => ticket.id !== deletedTicketId));
    setTotalCount(prev => Math.max(0, prev - 1));
    setSummaryTotal(prev => Math.max(0, prev - 1));
    if (deletedStatus === 'OPEN') setOpenCount(prev => Math.max(0, prev - 1));
    if (deletedStatus === 'IN_PROGRESS') setInProgressCount(prev => Math.max(0, prev - 1));
    if (deletedStatus === 'CLOSED') setClosedCount(prev => Math.max(0, prev - 1));
  };

  const handleTicketUpdated = (updatedTicket) => {
    const previousTicket = tickets.find(ticket => ticket.id === updatedTicket.id);
    if (previousTicket?.status !== updatedTicket.status) {
      if (previousTicket?.status === 'OPEN') setOpenCount(prev => Math.max(0, prev - 1));
      if (previousTicket?.status === 'IN_PROGRESS') setInProgressCount(prev => Math.max(0, prev - 1));
      if (previousTicket?.status === 'CLOSED') setClosedCount(prev => Math.max(0, prev - 1));
      if (updatedTicket.status === 'OPEN') setOpenCount(prev => prev + 1);
      if (updatedTicket.status === 'IN_PROGRESS') setInProgressCount(prev => prev + 1);
      if (updatedTicket.status === 'CLOSED') setClosedCount(prev => prev + 1);
    }
    setTickets(prev => prev.map(ticket => (ticket.id === updatedTicket.id ? updatedTicket : ticket)));
  };

  const applyFilters = (event) => {
    event.preventDefault();
    fetchTickets(1, filters);
  };

  const clearFilters = () => {
    const emptyFilters = { search: '', status: '', priority: '' };
    setFilters(emptyFilters);
    fetchTickets(1, emptyFilters);
  };

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

      <form onSubmit={applyFilters} className="grid gap-3 rounded-xl border border-gray-800 bg-gray-900/60 p-4 md:grid-cols-[minmax(0,1fr)_180px_180px_auto_auto] md:items-end">
        <label className="flex flex-col gap-1 text-sm text-gray-300">
          Buscar tickets
          <input
            data-cy="ticket-filter-search"
            value={filters.search}
            onChange={(event) => setFilters(prev => ({ ...prev, search: event.target.value }))}
            placeholder="Título ou descrição"
            className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white placeholder:text-gray-500 focus:border-teal-400 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-300">
          Status
          <select data-cy="ticket-filter-status" value={filters.status} onChange={(event) => setFilters(prev => ({ ...prev, status: event.target.value }))} className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-teal-400 focus:outline-none">
            <option value="">Todos</option>
            <option value="OPEN">Aberto</option>
            <option value="IN_PROGRESS">Em progresso</option>
            <option value="CLOSED">Fechado</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-300">
          Prioridade
          <select data-cy="ticket-filter-priority" value={filters.priority} onChange={(event) => setFilters(prev => ({ ...prev, priority: event.target.value }))} className="rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-teal-400 focus:outline-none">
            <option value="">Todas</option>
            <option value="LOW">Baixa</option>
            <option value="MEDIUM">Média</option>
            <option value="HIGH">Alta</option>
            <option value="URGENT">Urgente</option>
          </select>
        </label>
        <button data-cy="ticket-filter-submit" type="submit" className="rounded-md bg-teal-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-400">Filtrar</button>
        <button data-cy="ticket-filter-clear" type="button" onClick={clearFilters} className="rounded-md px-3 py-2 text-sm text-gray-300 transition hover:bg-gray-800 hover:text-white">Limpar</button>
      </form>

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
              agents={agents}
              hasActiveFilters={Boolean(filters.search || filters.status || filters.priority)}
            />
          </div>

          {/* Paginação — só aparece quando há mais de 1 página */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 py-2">
              <button
                data-cy="pagination-prev"
                onClick={() => fetchTickets(currentPage - 1, filters)}
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
                onClick={() => fetchTickets(currentPage + 1, filters)}
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
              Resumo geral
            </h2>
            <p className="mb-3 text-xs text-gray-500">Os status consideram todos os tickets visíveis; resultados refletem os filtros atuais.</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p className="rounded-lg bg-gray-800 p-3 text-gray-300"><span className="block text-xs">Total visível</span><span className="text-2xl font-bold text-white">{summaryTotal}</span></p>
              <p className="rounded-lg bg-gray-800 p-3 text-gray-300"><span className="block text-xs">Resultados</span><span className="text-2xl font-bold text-white">{totalCount}</span></p>
              <p className="rounded-lg bg-gray-800 p-3 text-gray-300"><span className="block text-xs">● Abertos</span><span className="text-2xl font-bold text-green-400">{openCount}</span></p>
              <p className="rounded-lg bg-gray-800 p-3 text-gray-300"><span className="block text-xs">◐ Em progresso</span><span className="text-2xl font-bold text-yellow-300">{inProgressCount}</span></p>
              <p className="col-span-2 rounded-lg bg-gray-800 p-3 text-gray-300"><span className="block text-xs">✓ Fechados</span><span className="text-2xl font-bold text-gray-200">{closedCount}</span></p>
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

