'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from "next-auth/react";
import { LuPlus, LuSearch, LuLayers, LuClock, LuListFilter, LuCircleCheck } from 'react-icons/lu';
import TicketList from "../../components/TicketList";
import { useTheme } from "../../components/ThemeProvider";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const { theme } = useTheme();
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
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${
            theme === 'light' ? 'text-slate-900' : 'text-white'
          }`}>
            Olá, {session?.user?.name || 'bem-vindo(a)'} 👋
          </h1>
          <p className={`mt-1 text-sm ${
            theme === 'light' ? 'text-slate-600' : 'text-slate-400'
          }`}>
            Organize e acompanhe os tickets do seu suporte em um só lugar.
          </p>
        </div>

        <Link
          data-cy="dashboard-new-ticket-link"
          href="/dashboard/tickets/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-sm hover:bg-teal-400 transition active:scale-[0.98]"
        >
          <LuPlus size={18} />
          Novo ticket
        </Link>
      </header>

      {/* Barra de Filtros */}
      <form onSubmit={applyFilters} className={`grid gap-3 rounded-xl border p-4 sm:grid-cols-2 md:grid-cols-[minmax(0,1fr)_160px_160px_auto_auto] md:items-end ${
        theme === 'light'
          ? 'bg-white border-slate-200 shadow-xs'
          : 'border-slate-800 bg-slate-900/70'
      }`}>
        <label className={`flex flex-col gap-1 text-xs font-semibold uppercase tracking-wider ${
          theme === 'light' ? 'text-slate-600' : 'text-slate-400'
        }`}>
          Buscar tickets
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <LuSearch size={16} />
            </span>
            <input
              data-cy="ticket-filter-search"
              value={filters.search}
              onChange={(event) => setFilters(prev => ({ ...prev, search: event.target.value }))}
              placeholder="Título ou descrição..."
              className={`w-full rounded-lg border py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 ${
                theme === 'light'
                  ? 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-teal-500'
                  : 'border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 focus:border-teal-400 focus:ring-teal-400'
              }`}
            />
          </div>
        </label>

        <label className={`flex flex-col gap-1 text-xs font-semibold uppercase tracking-wider ${
          theme === 'light' ? 'text-slate-600' : 'text-slate-400'
        }`}>
          Status
          <select 
            data-cy="ticket-filter-status" 
            value={filters.status} 
            onChange={(event) => setFilters(prev => ({ ...prev, status: event.target.value }))} 
            className={`rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
              theme === 'light'
                ? 'border-slate-300 bg-white text-slate-900 focus:border-teal-500 focus:ring-teal-500'
                : 'border-slate-700 bg-slate-800 text-white focus:border-teal-400 focus:ring-teal-400'
            }`}
          >
            <option value="">Todos</option>
            <option value="OPEN">Aberto</option>
            <option value="IN_PROGRESS">Em progresso</option>
            <option value="CLOSED">Fechado</option>
          </select>
        </label>

        <label className={`flex flex-col gap-1 text-xs font-semibold uppercase tracking-wider ${
          theme === 'light' ? 'text-slate-600' : 'text-slate-400'
        }`}>
          Prioridade
          <select 
            data-cy="ticket-filter-priority" 
            value={filters.priority} 
            onChange={(event) => setFilters(prev => ({ ...prev, priority: event.target.value }))} 
            className={`rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
              theme === 'light'
                ? 'border-slate-300 bg-white text-slate-900 focus:border-teal-500 focus:ring-teal-500'
                : 'border-slate-700 bg-slate-800 text-white focus:border-teal-400 focus:ring-teal-400'
            }`}
          >
            <option value="">Todas</option>
            <option value="LOW">Baixa</option>
            <option value="MEDIUM">Média</option>
            <option value="HIGH">Alta</option>
            <option value="URGENT">Urgente</option>
          </select>
        </label>

        <button data-cy="ticket-filter-submit" type="submit" className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-teal-400 shadow-xs active:scale-[0.98]">
          Filtrar
        </button>
        <button data-cy="ticket-filter-clear" type="button" onClick={clearFilters} className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition ${
          theme === 'light' 
            ? 'border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900' 
            : 'border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
        }`}>
          Limpar
        </button>
      </form>

      {/* Resumo rápido + lista */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        {/* Lista de tickets + controles de paginação */}
        <div className="flex flex-col gap-4">
          <div className={`rounded-xl border p-4 md:p-6 shadow-sm ${
            theme === 'light'
              ? 'bg-white border-slate-200'
              : 'border-slate-800 bg-slate-900/60'
          }`}>
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
                className={`px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-40 ${
                  theme === 'light'
                    ? 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                    : 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'
                }`}
              >
                ← Anterior
              </button>
              <span className={`text-sm font-medium ${
                theme === 'light' ? 'text-slate-600' : 'text-slate-400'
              }`}>
                Página {currentPage} de {totalPages}
              </span>
              <button
                data-cy="pagination-next"
                onClick={() => fetchTickets(currentPage + 1, filters)}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-40 ${
                  theme === 'light'
                    ? 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                    : 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'
                }`}
              >
                Próxima →
              </button>
            </div>
          )}
        </div>

        {/* Painel lateral com resumo e dicas */}
        <aside className="space-y-4">
          <div className={`rounded-xl border p-4 shadow-sm ${
            theme === 'light' ? 'bg-white border-slate-200' : 'border-slate-800 bg-slate-900/80'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-sm font-bold uppercase tracking-wider ${
                theme === 'light' ? 'text-slate-900' : 'text-slate-200'
              }`}>
                Resumo Geral
              </h2>
              <span className="font-mono text-xs text-slate-500">
                {totalCount} {totalCount === 1 ? 'ticket' : 'tickets'}
              </span>
            </div>
            <p className={`mb-4 text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
              Status consolidados de acordo com os filtros selecionados.
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <div className={`rounded-lg p-3 border transition-colors ${
                theme === 'light' ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-800/60 border-slate-700/60'
              }`}>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <span>Total</span>
                  <LuLayers size={14} className="text-teal-500" />
                </div>
                <span className={`text-2xl font-extrabold ${
                  theme === 'light' ? 'text-slate-900' : 'text-white'
                }`}>{summaryTotal}</span>
              </div>

              <div className={`rounded-lg p-3 border transition-colors ${
                theme === 'light' ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-800/60 border-slate-700/60'
              }`}>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <span>Filtrados</span>
                  <LuSearch size={14} className="text-blue-500" />
                </div>
                <span className={`text-2xl font-extrabold ${
                  theme === 'light' ? 'text-slate-900' : 'text-white'
                }`}>{totalCount}</span>
              </div>

              <div className={`rounded-lg p-3 border transition-colors ${
                theme === 'light' ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-800/60 border-slate-700/60'
              }`}>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                    Abertos
                  </span>
                  <LuClock size={14} className="text-slate-400" />
                </div>
                <span className={`text-2xl font-extrabold ${
                  theme === 'light' ? 'text-slate-900' : 'text-white'
                }`}>{openCount}</span>
              </div>

              <div className={`rounded-lg p-3 border transition-colors ${
                theme === 'light' ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-800/60 border-slate-700/60'
              }`}>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                    Em progresso
                  </span>
                  <LuListFilter size={14} className="text-slate-400" />
                </div>
                <span className={`text-2xl font-extrabold ${
                  theme === 'light' ? 'text-slate-900' : 'text-white'
                }`}>{inProgressCount}</span>
              </div>

              <div className={`col-span-2 rounded-lg p-3 border transition-colors ${
                theme === 'light' ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-800/60 border-slate-700/60'
              }`}>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden="true" />
                    Fechados
                  </span>
                  <LuCircleCheck size={14} className="text-slate-400" />
                </div>
                <span className={`text-2xl font-extrabold ${
                  theme === 'light' ? 'text-slate-900' : 'text-white'
                }`}>{closedCount}</span>
              </div>
            </div>
          </div>

          <div className={`rounded-xl border p-4 text-xs leading-relaxed ${
            theme === 'light' ? 'bg-white border-slate-200 text-slate-600' : 'border-slate-800 bg-slate-900/60 text-slate-300'
          }`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${
              theme === 'light' ? 'text-slate-900' : 'text-slate-100'
            }`}>
              💡 Dica rápida
            </h3>
            <p>
              Use os status <span className="font-semibold text-teal-600 dark:text-teal-400">Aberto</span>,{' '}
              <span className="font-semibold text-amber-600 dark:text-amber-400">Em Progresso</span> e{' '}
              <span className="font-semibold">Fechado</span> para organizar o fluxo de atendimento da equipe.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}

