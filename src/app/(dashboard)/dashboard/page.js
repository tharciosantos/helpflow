'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSession } from "next-auth/react";
import { LuPlus, LuSearch, LuLayers, LuClock, LuListFilter, LuCircleCheck, LuCopy, LuCheck, LuBuilding, LuShare2, LuCircleAlert, LuUser, LuArrowUpDown } from 'react-icons/lu';
import TicketList from "../../components/TicketList";
import { useTheme } from "../../components/ThemeProvider";
import { formatDuration } from '@/lib/metrics';

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
  const [overdueCount, setOverdueCount] = useState(0);
  const [avgResolutionMs, setAvgResolutionMs] = useState(null);
  const [avgFirstResponseMs, setAvgFirstResponseMs] = useState(null);
  const [resolvedSample, setResolvedSample] = useState(0);
  const [filters, setFilters] = useState({ search: '', status: '', priority: '', overdue: false, mine: false, sort: 'recent' });
  const [agents, setAgents] = useState([]);
  const [copiedType, setCopiedType] = useState('');
  const abortRef = useRef(null);

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(''), 2500);
  };

  const fetchTickets = useCallback(async (page = 1, activeFilters = {}) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError('');
    try {
      const { search = '', status = '', priority = '', overdue = false, mine = false, sort = 'recent' } = activeFilters;
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('status', status);
      if (priority) params.set('priority', priority);
      if (overdue) params.set('overdue', 'true');
      if (mine) params.set('mine', 'true');
      if (sort === 'dueDate') params.set('sort', 'dueDate');

      const res = await fetch(`/api/tickets?${params.toString()}`, { signal: controller.signal });
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
      setOverdueCount(data.summary.overdue || 0);
      setAvgResolutionMs(data.summary.avgResolutionMs ?? null);
      setAvgFirstResponseMs(data.summary.avgFirstResponseMs ?? null);
      setResolvedSample(data.summary.resolvedSample || 0);
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setError(err.message);
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Debounce da busca textual (status/prioridade continuam instantâneos via selects)
  useEffect(() => {
    if (status !== 'authenticated') return;
    const t = setTimeout(() => {
      fetchTickets(1, filters);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, status]);

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
    abortRef.current?.abort();
    fetchTickets(1, filters);
  };

  const clearFilters = () => {
    const emptyFilters = { search: '', status: '', priority: '', overdue: false, mine: false, sort: 'recent' };
    setFilters(emptyFilters);
    // O debounce só observa `search`; os demais filtros precisam de refetch.
    fetchTickets(1, emptyFilters);
  };

  const handleToggleOverdue = () => {
    const next = { ...filters, overdue: !filters.overdue };
    setFilters(next);
    fetchTickets(1, next);
  };

  const handleToggleMine = () => {
    const next = { ...filters, mine: !filters.mine };
    setFilters(next);
    fetchTickets(1, next);
  };

  const handleSortChange = (value) => {
    const next = { ...filters, sort: value };
    setFilters(next);
    fetchTickets(1, next);
  };

  const handleStatusFilter = (value) => {
    const next = { ...filters, status: value };
    setFilters(next);
    fetchTickets(1, next);
  };

  const handlePriorityFilter = (value) => {
    const next = { ...filters, priority: value };
    setFilters(next);
    fetchTickets(1, next);
  };

  return (
    <div className="space-y-8">
      {/* Cabeçalho / boas-vindas */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${
            theme === 'light' ? 'text-slate-900' : 'text-slate-100'
          }`}>
            Olá, {session?.user?.name || 'bem-vindo(a)'}
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
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2.5 text-sm font-semibold shadow-xs transition active:scale-[0.98]"
        >
          <LuPlus size={18} />
          Novo ticket
        </Link>
      </header>

      {/* Card da Empresa / Código de Convite de Funcionários (Apenas para AGENT com Empresa) */}
      {session?.user?.role === 'AGENT' && session?.user?.companyCode && (
        <div
          data-cy="company-invite-card"
          className={`rounded-2xl border p-5 sm:p-6 transition-all ${
            theme === 'light'
              ? 'bg-emerald-50/70 border-emerald-200 text-slate-900 shadow-xs'
              : 'bg-emerald-950/20 border-emerald-800/60 text-slate-100 shadow-xs'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`p-1.5 rounded-lg ${
                  theme === 'light' ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-900/60 text-emerald-300'
                }`}>
                  <LuBuilding size={18} />
                </span>
                <h2 className="text-base sm:text-lg font-bold">
                  {session.user.companyName || 'Sua Empresa'} · Painel de Atendimento
                </h2>
              </div>
              <p className={`text-xs sm:text-sm ${
                theme === 'light' ? 'text-slate-600' : 'text-slate-400'
              }`}>
                Compartilhe o código ou link de cadastro com seus funcionários para que eles abram chamados privados para sua equipe.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono text-sm font-bold tracking-wider ${
                theme === 'light'
                  ? 'bg-white border-emerald-300 text-emerald-800'
                  : 'bg-slate-900 border-emerald-700 text-emerald-300'
              }`}>
                <span>{session.user.companyCode}</span>
                <button
                  type="button"
                  data-cy="copy-company-code"
                  onClick={() => handleCopy(session.user.companyCode, 'code')}
                  className={`p-1 rounded-md transition hover:bg-emerald-100 dark:hover:bg-emerald-900/50 ${
                    copiedType === 'code' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
                  }`}
                  title="Copiar código da empresa"
                >
                  {copiedType === 'code' ? <LuCheck size={16} /> : <LuCopy size={16} />}
                </button>
              </div>

              <button
                type="button"
                data-cy="copy-invite-link"
                onClick={() => {
                  const origin = typeof window !== 'undefined' ? window.location.origin : '';
                  handleCopy(`${origin}/register?companyCode=${session.user.companyCode}`, 'link');
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition active:scale-[0.98] ${
                  theme === 'light'
                    ? 'bg-white border-slate-300 hover:bg-slate-50 text-slate-800'
                    : 'bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-200'
                }`}
              >
                {copiedType === 'link' ? (
                  <>
                    <LuCheck size={14} className="text-emerald-600" />
                    <span>Link copiado!</span>
                  </>
                ) : (
                  <>
                    <LuShare2 size={14} />
                    <span>Copiar link de convite</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
              className={`w-full rounded-lg border py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 ${
                theme === 'light'
                  ? 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-400/20'
                  : 'border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:ring-emerald-400/20'
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
            onChange={(event) => handleStatusFilter(event.target.value)} 
            className={`rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
              theme === 'light'
                ? 'border-slate-300 bg-white text-slate-900 focus:border-emerald-500 focus:ring-emerald-400/20'
                : 'border-slate-700 bg-slate-800 text-white focus:border-emerald-400 focus:ring-emerald-400/20'
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
            onChange={(event) => handlePriorityFilter(event.target.value)} 
            className={`rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
              theme === 'light'
                ? 'border-slate-300 bg-white text-slate-900 focus:border-emerald-500 focus:ring-emerald-400/20'
                : 'border-slate-700 bg-slate-800 text-white focus:border-emerald-400 focus:ring-emerald-400/20'
            }`}
          >
            <option value="">Todas</option>
            <option value="LOW">Baixa</option>
            <option value="MEDIUM">Média</option>
            <option value="HIGH">Alta</option>
            <option value="URGENT">Urgente</option>
          </select>
        </label>

        <button data-cy="ticket-filter-submit" type="submit" className="rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 text-sm font-semibold transition shadow-xs active:scale-[0.98]">
          Filtrar
        </button>
        <button data-cy="ticket-filter-clear" type="button" onClick={clearFilters} className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition ${
          theme === 'light' 
            ? 'border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900' 
            : 'border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
        }`}>
          Limpar
        </button>
      </form>

      {/* Atalhos de produtividade + ordenação por prazo */}
      <div
        data-cy="ticket-productivity-bar"
        className={`flex flex-wrap items-center gap-2 rounded-xl border p-3 ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'border-slate-800 bg-slate-900/70'
        }`}
      >
        <span className={`mr-1 text-xs font-semibold uppercase tracking-wider ${
          theme === 'light' ? 'text-slate-600' : 'text-slate-400'
        }`}>
          Atalhos
        </span>

        <button
          type="button"
          data-cy="ticket-filter-overdue"
          onClick={handleToggleOverdue}
          aria-pressed={filters.overdue}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition active:scale-[0.98] ${
            filters.overdue
              ? 'border-red-500 bg-red-600 text-white'
              : theme === 'light'
                ? 'border-slate-300 text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-300'
                : 'border-slate-700 text-slate-300 hover:bg-red-950/40 hover:text-red-300 hover:border-red-800'
          }`}
        >
          <LuCircleAlert size={14} />
          Só atrasados
        </button>

        <button
          type="button"
          data-cy="ticket-filter-mine"
          onClick={handleToggleMine}
          aria-pressed={filters.mine}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition active:scale-[0.98] ${
            filters.mine
              ? 'border-emerald-500 bg-emerald-600 text-white'
              : theme === 'light'
                ? 'border-slate-300 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
                : 'border-slate-700 text-slate-300 hover:bg-emerald-950/40 hover:text-emerald-300 hover:border-emerald-800'
          }`}
        >
          <LuUser size={14} />
          {session?.user?.role === 'AGENT' ? 'Só meus' : 'Só os que abri'}
        </button>

        <label className={`ml-auto flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${
          theme === 'light' ? 'text-slate-600' : 'text-slate-400'
        }`}>
          <LuArrowUpDown size={14} />
          Ordenar
          <select
            data-cy="ticket-sort"
            value={filters.sort}
            onChange={(event) => handleSortChange(event.target.value)}
            className={`rounded-lg border px-3 py-2 text-sm font-medium normal-case tracking-normal focus:outline-none focus:ring-2 ${
              theme === 'light'
                ? 'border-slate-300 bg-white text-slate-900 focus:border-emerald-500 focus:ring-emerald-400/20'
                : 'border-slate-700 bg-slate-800 text-white focus:border-emerald-400 focus:ring-emerald-400/20'
            }`}
          >
            <option value="recent">Mais recentes</option>
            <option value="dueDate">Prazo mais próximo</option>
          </select>
        </label>
      </div>

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
              hasActiveFilters={Boolean(filters.search || filters.status || filters.priority || filters.overdue || filters.mine)}
            />
          </div>

          {/* Paginação - só aparece quando há mais de 1 página */}
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
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/60 border-slate-700/60'
              }`}>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <span>Total</span>
                  <LuLayers size={14} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className={`text-2xl font-extrabold ${
                  theme === 'light' ? 'text-slate-900' : 'text-white'
                }`}>{summaryTotal}</span>
              </div>

              <div className={`rounded-lg p-3 border transition-colors ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/60 border-slate-700/60'
              }`}>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <span>Filtrados</span>
                  <LuSearch size={14} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className={`text-2xl font-extrabold ${
                  theme === 'light' ? 'text-slate-900' : 'text-white'
                }`}>{totalCount}</span>
              </div>

              <div className={`rounded-lg p-3 border transition-colors ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/60 border-slate-700/60'
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
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/60 border-slate-700/60'
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

              <div className={`rounded-lg p-3 border transition-colors ${
                theme === 'light' ? 'bg-red-50 border-red-200' : 'bg-red-950/30 border-red-800/60'
              }`}>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden="true" />
                    Atrasado
                  </span>
                  <LuCircleAlert size={14} className={theme === 'light' ? 'text-red-500' : 'text-red-400'} />
                </div>
                <span className={`text-2xl font-extrabold ${
                  theme === 'light' ? 'text-red-700' : 'text-red-400'
                }`}>{overdueCount}</span>
              </div>


              <div className={`col-span-2 rounded-lg p-3 border transition-colors ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/60 border-slate-700/60'
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

          <div
            data-cy="metrics-card"
            className={`rounded-xl border p-4 shadow-sm ${
              theme === 'light' ? 'bg-white border-slate-200' : 'border-slate-800 bg-slate-900/80'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-sm font-bold uppercase tracking-wider ${
                theme === 'light' ? 'text-slate-900' : 'text-slate-200'
              }`}>
                Métricas de Atendimento
              </h2>
              <span className="font-mono text-xs text-slate-500">
                {resolvedSample} {resolvedSample === 1 ? 'resolvido' : 'resolvidos'}
              </span>
            </div>

            <div className="space-y-2.5">
              <div className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/60 border-slate-700/60'
              }`}>
                <span className={`flex items-center gap-2 text-xs font-medium ${
                  theme === 'light' ? 'text-slate-600' : 'text-slate-300'
                }`}>
                  <LuCircleCheck size={14} className="text-emerald-500" />
                  Tempo médio de resolução
                </span>
                <span
                  data-cy="metric-avg-resolution"
                  className={`font-mono text-sm font-bold ${
                    theme === 'light' ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  {formatDuration(avgResolutionMs)}
                </span>
              </div>

              <div className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/60 border-slate-700/60'
              }`}>
                <span className={`flex items-center gap-2 text-xs font-medium ${
                  theme === 'light' ? 'text-slate-600' : 'text-slate-300'
                }`}>
                  <LuClock size={14} className="text-sky-500" />
                  Tempo até a 1ª resposta
                </span>
                <span
                  data-cy="metric-avg-first-response"
                  className={`font-mono text-sm font-bold ${
                    theme === 'light' ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  {formatDuration(avgFirstResponseMs)}
                </span>
              </div>
            </div>

            <p className={`mt-3 text-[11px] leading-relaxed ${
              theme === 'light' ? 'text-slate-500' : 'text-slate-400'
            }`}>
              Médias sobre os chamados já resolvidos, dentro do seu escopo de visão. Os filtros da lista não alteram estes números.
            </p>
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
              Use os status <span className="font-semibold text-emerald-600 dark:text-emerald-400">Aberto</span>,{' '}
              <span className="font-semibold text-amber-600 dark:text-amber-400">Em Progresso</span> e{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-300">Fechado</span> para organizar o fluxo de atendimento da equipe.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}

