import Link from "next/link";
import { useState } from "react";
import { LuTicket, LuInbox, LuUser, LuCalendar, LuCircleAlert, LuPencil, LuTrash2, LuShield } from "react-icons/lu";
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
      <div aria-label="Carregando tickets" aria-busy="true" className="mt-4 space-y-4">
        {[1, 2, 3].map((item) => (
          <div key={item} className={"animate-pulse rounded-xl border p-5 " + (theme === "light" ? "bg-slate-50 border-slate-200" : "bg-slate-800/40 border-slate-800")}>
            <div className={"h-5 w-2/3 rounded " + (theme === "light" ? "bg-slate-200" : "bg-slate-700")} />
            <div className={"mt-4 h-3 w-full rounded " + (theme === "light" ? "bg-slate-200" : "bg-slate-700")} />
            <div className={"mt-2 h-3 w-1/2 rounded " + (theme === "light" ? "bg-slate-200" : "bg-slate-700")} />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className={"mt-4 rounded-xl border p-6 text-center " + (theme === "light" ? "bg-red-50 border-red-200 text-red-600" : "bg-red-500/10 border-red-500/50 text-red-400")}>
        <LuCircleAlert size={28} className="mx-auto mb-2 text-red-500" />
        <p className="font-semibold">Erro ao carregar tickets</p>
        <p className="mt-1 text-sm opacity-90">{error}</p>
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
          <div className={"rounded-xl border border-dashed p-10 text-center " + (theme === "light" ? "border-slate-300 bg-slate-50/50" : "border-slate-800 bg-slate-900/30")}>
            <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border ${
              theme === 'light' ? 'border-slate-200 bg-white text-slate-400' : 'border-slate-700 bg-slate-800 text-slate-500'
            }`}>
              <LuInbox size={24} />
            </div>
            <p className={`font-medium text-sm ${theme === "light" ? "text-slate-600" : "text-slate-300"}`}>
              {hasActiveFilters ? "Nenhum ticket encontrado para os filtros selecionados." : "Você ainda não possui tickets abertos."}
            </p>
            {!hasActiveFilters && (
              <Link href="/dashboard/tickets/new" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 underline hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition">
                <LuTicket size={16} />
                Criar meu primeiro ticket →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-3.5">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                data-cy={`ticket-card-${ticket.id}`}
                className={`group relative rounded-xl border p-5 transition-all duration-200 hover:shadow-md ${
                  theme === 'light'
                    ? 'bg-white border-slate-200 hover:border-emerald-200 shadow-xs'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col gap-3.5">
                  {/* Cabeçalho do Card */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="text-base sm:text-lg font-semibold leading-snug">
                      <Link
                        href={`/ticket/${ticket.id}`}
                        className={`transition-colors hover:text-emerald-600 dark:hover:text-emerald-400 ${
                          theme === 'light' ? 'text-slate-900' : 'text-white'
                        }`}
                      >
                        {ticket.title}
                      </Link>
                    </h3>

                    <div className="flex items-center gap-2">
                      <span className={"rounded-full px-2.5 py-0.5 text-xs font-medium border " + getStatusBadgeClasses(ticket.status, theme)}>
                        {getStatusDisplayNamePT(ticket.status)}
                      </span>
                      {(() => {
                        const badge = getPriorityBadge(ticket.priority, theme);
                        return (
                          <span className={"rounded-full px-2.5 py-0.5 text-xs font-medium border " + badge.classes}>
                            {badge.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Descrição */}
                  <p className={`line-clamp-2 text-sm leading-relaxed ${
                    theme === 'light' ? 'text-slate-600' : 'text-slate-400'
                  }`}>
                    {ticket.description}
                  </p>

                  {/* Metadados */}
                  <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 text-xs pt-2 border-t ${
                    theme === 'light' ? 'border-slate-100 text-slate-500' : 'border-slate-800/80 text-slate-400'
                  }`}>
                    <span className={`font-mono font-medium px-2 py-0.5 rounded border text-[11px] ${
                      theme === 'light'
                        ? 'bg-slate-100 border-slate-200 text-slate-700'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}>
                      #{ticket.id.slice(-6)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <LuUser size={13} className="text-slate-400" />
                      <span>{ticket.author?.name || ticket.author?.email}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <LuCalendar size={13} className="text-slate-400" />
                      <span>{new Date(ticket.createdAt).toLocaleDateString('pt-BR')}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 sm:ml-auto">
                      <LuShield size={13} className={ticket.agent ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'} />
                      <span>Resp: <strong className={theme === 'light' ? 'text-slate-700 font-medium' : 'text-slate-300 font-medium'}>{ticket.agent?.name || ticket.agent?.email || 'Não atribuído'}</strong></span>
                    </span>
                  </div>

                  {/* Ações Rápidas (Agente / Autor) */}
                  {(session?.user?.id === ticket.authorId || session?.user?.role === 'AGENT') && (
                    <div className={`mt-1 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-dashed ${
                      theme === 'light' ? 'border-slate-200' : 'border-slate-800'
                    }`}>
                      <div className="flex flex-wrap items-center gap-3">
                        {session?.user?.role === 'AGENT' && (
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold uppercase tracking-wider ${
                              theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                            }`}>Status:</span>
                            <select
                              disabled={updatingId === ticket.id}
                              value={ticket.status}
                              onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                              className={`rounded-lg px-2.5 py-1 text-xs font-medium border focus:outline-none focus:ring-1 focus:ring-emerald-400 ${
                                theme === 'light'
                                  ? 'bg-slate-50 border-slate-300 text-slate-900'
                                  : 'bg-slate-800 border-slate-700 text-white'
                              }`}
                            >
                              <option value="OPEN">Aberto</option>
                              <option value="IN_PROGRESS">Em Progresso</option>
                              <option value="CLOSED">Fechado</option>
                            </select>
                          </div>
                        )}

                        {session?.user?.role === 'AGENT' && (
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold uppercase tracking-wider ${
                              theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                            }`}>Responsável:</span>
                            <select
                              disabled={updatingId === ticket.id}
                              value={ticket.agentId || ''}
                              onChange={(e) => handleAgentChange(ticket.id, e.target.value)}
                              className={`rounded-lg px-2.5 py-1 text-xs font-medium border focus:outline-none focus:ring-1 focus:ring-emerald-400 ${
                                theme === 'light'
                                  ? 'bg-slate-50 border-slate-300 text-slate-900'
                                  : 'bg-slate-800 border-slate-700 text-white'
                              }`}
                            >
                              <option value="">Não atribuído</option>
                              {agents.map((member) => (
                                <option key={member.id} value={member.id}>
                                  {member.name || member.email} {member.role === 'AGENT' ? '(TI / Suporte)' : '(Funcionário)'}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 sm:ml-auto">
                        <Link
                          href={`/dashboard/ticket/${ticket.id}/edit`}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                            theme === 'light'
                              ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-emerald-600 hover:border-slate-300'
                              : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-600'
                          }`}
                        >
                          <LuPencil size={12} />
                          Editar
                        </Link>
                        <button
                          onClick={() => handleDelete(ticket.id)}
                          disabled={deletingId === ticket.id}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                            theme === 'light'
                              ? 'border-slate-200 bg-white text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                              : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-red-950/40 hover:text-red-400 hover:border-red-800/60'
                          }`}
                        >
                          <LuTrash2 size={12} />
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

