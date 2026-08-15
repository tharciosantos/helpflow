"use client";

import Link from "next/link";
import { useState } from "react";
import { getStatusDisplayNamePT, getStatusBadgeClasses, getPriorityBadge } from '@/lib/ticketUtils';
import { useTheme } from "./ThemeProvider";

export default function TicketList({
  tickets,
  loading,
  error,
  onTicketDeleted,
  onTicketUpdated,
  session,
  agents = [],
  hasActiveFilters = false,
}) {
  const { theme } = useTheme();
  const [deletingId, setDeletingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleDelete = async (ticketId) => {
    if (window.confirm("Tem certeza que deseja excluir este ticket?")) {
      setErrorMessage('');
      setSuccessMessage('');
      setDeletingId(ticketId);
      try {
        const res = await fetch(`/api/tickets/${ticketId}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Falha ao excluir o ticket.");
        const deletedTicket = tickets.find(t => t.id === ticketId);
        onTicketDeleted?.(ticketId, deletedTicket?.status);
        setSuccessMessage('Ticket excluído com sucesso.');
      } catch (err) {
        setErrorMessage(err.message || 'Erro ao excluir o ticket.');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    setErrorMessage('');
    setSuccessMessage('');
    setUpdatingId(ticketId);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Falha ao atualizar o status.");
      const updatedTicket = await res.json();
      onTicketUpdated?.(updatedTicket);
      setSuccessMessage('Status atualizado com sucesso.');
    } catch (err) {
      setErrorMessage(err.message || 'Erro ao atualizar o status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAgentChange = async (ticketId, agentId) => {
    setErrorMessage('');
    setSuccessMessage('');
    setUpdatingId(ticketId);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agentId || null }),
      });
      if (!res.ok) throw new Error('Falha ao atribuir o ticket.');
      onTicketUpdated?.(await res.json());
      setSuccessMessage('Responsável atualizado com sucesso.');
    } catch (err) {
      setErrorMessage(err.message || 'Erro ao atribuir o ticket.');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div aria-label="Carregando tickets" aria-busy="true" className="mt-8 space-y-4">
        {[1, 2, 3].map((item) => (
          <div key={item} className={"animate-pulse rounded-xl border p-5 " + (theme === "light" ? "bg-slate-50 border-slate-200" : "bg-gray-800/40 border-gray-800")}>
            <div className={"h-5 w-2/3 rounded " + (theme === "light" ? "bg-slate-200" : "bg-gray-700")} />
            <div className={"mt-4 h-3 w-full rounded " + (theme === "light" ? "bg-slate-200" : "bg-gray-700")} />
            <div className={"mt-2 h-3 w-1/2 rounded " + (theme === "light" ? "bg-slate-200" : "bg-gray-700")} />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className={"mt-8 rounded-xl border p-6 text-center " + (theme === "light" ? "bg-red-50 border-red-200 text-red-600" : "bg-red-500/10 border-red-500/50 text-red-400")}>
        <p className="font-semibold">Erro ao carregar tickets</p>
        <p className="mt-2 text-sm opacity-90">{error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {errorMessage && (
          <div role="alert" className={"rounded-md p-3 text-sm border " + (theme === "light" ? "bg-red-50 border-red-200 text-red-700" : "bg-red-500/20 border-red-500/50 text-red-200")}>
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div role="status" className={"rounded-md p-3 text-sm border " + (theme === "light" ? "bg-green-50 border-green-200 text-green-700" : "bg-green-500/20 border-green-500/50 text-green-200")}>
            {successMessage}
          </div>
        )}

        {tickets.length === 0 ? (
          <div className={"rounded-xl border border-dashed p-12 text-center " + (theme === "light" ? "border-slate-300 bg-slate-50" : "border-gray-700 bg-gray-900/40")}>
            <p className={theme === "light" ? "text-slate-500" : "text-gray-400"}>
              {hasActiveFilters ? "Nenhum ticket encontrado para os filtros selecionados." : "Você ainda não possui tickets abertos."}
            </p>
            {!hasActiveFilters && (
              <Link href="/dashboard/tickets/new" className="mt-4 inline-block text-teal-500 hover:text-teal-400 font-medium">
                Criar meu primeiro ticket →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {tickets.map((ticket) => (
              <div key={ticket.id} data-cy={`ticket-card-${ticket.id}`} className={"group relative rounded-xl border p-5 shadow-sm transition-all hover:shadow-md " + (theme === "light" ? "bg-white border-slate-200 hover:border-slate-300" : "bg-gray-800/40 border-gray-800 hover:border-gray-700")}>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className={"text-lg font-semibold leading-snug " + (theme === "light" ? "text-slate-900" : "text-white")}>
                      <Link href={`/ticket/${ticket.id}`} className="hover:text-teal-500 transition-colors">
                        {ticket.title}
                      </Link>
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className={"rounded-full px-2.5 py-0.5 text-xs font-medium border " + getStatusBadgeClasses(ticket.status, theme)}>
                        {getStatusDisplayNamePT(ticket.status)}
                      </span>
                      <span className="flex items-center">{(() => { const badge = getPriorityBadge(ticket.priority, theme); return <span className={"px-2.5 py-0.5 rounded-full text-xs font-medium border " + badge.classes}>{badge.label}</span>; })()}</span>
                    </div>
                  </div>
                  <p className={"line-clamp-2 text-sm leading-relaxed " + (theme === "light" ? "text-slate-600" : "text-gray-400")}>
                    {ticket.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                    <span className={theme === "light" ? "text-slate-500" : "text-gray-500"}>
                      ID: <span className={theme === "light" ? "text-slate-700 font-mono" : "text-gray-300 font-mono"}>#{ticket.id.slice(-6)}</span>
                    </span>
                    <span className={theme === "light" ? "text-slate-500" : "text-gray-500"}>
                      Criado por: <span className={theme === "light" ? "text-slate-700 font-medium" : "text-gray-300 font-medium"}>{ticket.author?.name || ticket.author?.email}</span>
                    </span>
                    <span className={theme === "light" ? "text-slate-500" : "text-gray-500"}>
                      Em: {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <p className={"mt-2 text-xs " + (theme === "light" ? "text-slate-500" : "text-gray-500")}>
                    Responsável: <span className={theme === "light" ? "text-slate-700 font-medium" : "text-gray-300 font-medium"}>{ticket.agent?.name || ticket.agent?.email || 'Não atribuído'}</span>
                  </p>
                  {(session?.user?.id === ticket.authorId || session?.user?.role === 'AGENT') && (
                    <div className="mt-4 flex flex-col gap-4 pt-4 border-t border-dashed border-slate-200 dark:border-gray-700">
                      <div className="flex flex-wrap gap-4">
                        {session?.user?.role === 'AGENT' && (
                          <label className={"flex flex-col gap-1 text-sm " + (theme === "light" ? "text-slate-700" : "text-gray-300")}>
                            Status
                            <select disabled={updatingId === ticket.id} value={ticket.status} onChange={(e) => handleStatusChange(ticket.id, e.target.value)} className={"rounded-md px-3 py-1.5 text-sm border focus:outline-none focus:ring-1 focus:ring-teal-500 w-40 " + (theme === "light" ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-gray-700 border-gray-600 text-white")}>
                              <option value="OPEN">Aberto</option>
                              <option value="IN_PROGRESS">Em Progresso</option>
                              <option value="CLOSED">Fechado</option>
                            </select>
                          </label>
                        )}
                        {session?.user?.role === 'AGENT' && (
                          <label className={"flex flex-col gap-1 text-sm " + (theme === "light" ? "text-slate-700" : "text-gray-300")}>
                            Responsável
                            <select disabled={updatingId === ticket.id} value={ticket.agentId || ''} onChange={(e) => handleAgentChange(ticket.id, e.target.value)} className={"rounded-md px-3 py-1.5 text-sm border focus:outline-none focus:ring-1 focus:ring-teal-500 w-56 " + (theme === "light" ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-gray-700 border-gray-600 text-white")}>
                              <option value="">Não atribuído</option>
                              {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name || agent.email}</option>)}
                            </select>
                          </label>
                        )}
                      </div>
                      <div className="flex gap-4 text-sm mt-1">
                        <Link href={`/dashboard/ticket/${ticket.id}/edit`} className="text-teal-600 dark:text-teal-400 hover:underline font-medium">Editar Ticket</Link>
                        <button onClick={() => handleDelete(ticket.id)} disabled={deletingId === ticket.id} className="text-red-600 dark:text-red-400 hover:underline font-medium disabled:opacity-50">
                          {deletingId === ticket.id ? "Excluindo..." : "Excluir"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

