"use client";

import Link from "next/link";
import { useState } from "react";
import { getStatusDisplayNamePT, getStatusBadgeClasses, getPriorityBadge } from '@/lib/ticketUtils';

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
  const [deletingId, setDeletingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // ======================= DELETE =========================
  const handleDelete = async (ticketId) => {
    if (window.confirm("Tem certeza que deseja excluir este ticket?")) {
      setErrorMessage('');
      setSuccessMessage('');
      setDeletingId(ticketId);
      try {
        const res = await fetch(`/api/tickets/${ticketId}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          throw new Error("Falha ao excluir o ticket.");
        }

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

  // ======================= UPDATE STATUS =========================
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

  // ======================= LOADING / ERROR =========================
  if (loading) {
    return (
      <div aria-label="Carregando tickets" aria-busy="true" className="mt-8 space-y-4">
        {[1, 2, 3].map((item) => (
          <div key={item} className="animate-pulse rounded-xl border border-gray-800 bg-gray-800/40 p-5">
            <div className="h-5 w-2/3 rounded bg-gray-700" />
            <div className="mt-4 h-3 w-full rounded bg-gray-700" />
            <div className="mt-2 h-3 w-1/2 rounded bg-gray-700" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-center text-red-500 mt-12">{error}</p>;
  }

  // ======================= UI =========================
  return (
    <>
      {errorMessage && (
        <div role="alert" className="mb-4 p-3 bg-red-900/40 border border-red-700 rounded-lg text-sm text-red-300 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            aria-label="Fechar mensagem de erro"
            onClick={() => setErrorMessage('')}
            className="ml-4 text-red-400 hover:text-red-200 font-bold"
          >
            ✕
          </button>
        </div>
      )}
      {successMessage && (
        <p role="status" className="mb-4 rounded-lg border border-teal-700 bg-teal-900/30 p-3 text-sm text-teal-200">
          {successMessage}
        </p>
      )}
      <div className="mt-12">
        <h2 className="text-2xl font-semibold mb-6 text-white">
          {session?.user?.role === 'AGENT' ? 'Tickets' : 'Meus tickets'}
        </h2>

        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-gray-400 mb-3">
              {hasActiveFilters ? 'Nenhum ticket corresponde aos filtros atuais.' : 'Você ainda não tem tickets.'}
            </p>
            {!hasActiveFilters && <Link
              data-cy="ticket-empty-create-link"
              href="/dashboard/tickets/new"
              className="inline-flex items-center justify-center rounded-md bg-teal-500 px-4 py-2 text-sm font-medium text-white hover:bg-teal-400 transition"
            >
              + Criar primeiro ticket
            </Link>}
          </div>
        ) : (
          <div>
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                data-cy="ticket-card"
                data-ticket-id={ticket.id}
                className="mt-6"
              >
                <div className="p-5 bg-gray-800/40 border border-gray-700 rounded-xl hover:bg-gray-800/60 transition-colors">

                  {/* TÍTULO + BADGES */}
                  <div className="flex items-center justify-between mb-2">
                    <Link
                      data-cy={`ticket-${ticket.id}-detail-link`}
                      href={`/ticket/${ticket.id}`}
                      className="hover:underline"
                    >
                      <h3 data-cy="ticket-title" className="text-lg font-medium text-white">
                        {ticket.title}
                      </h3>
                    </Link>

                    {/* Os dois badges ficam juntos à direita */}
                    <div className="flex items-center gap-2">
                      {/* BADGE DE STATUS */}
                      <span
                        data-cy="ticket-status-badge"
                        className={`px-3 py-1 text-xs rounded-full font-medium ${getStatusBadgeClasses(ticket.status)}`}
                      >
                        {getStatusDisplayNamePT(ticket.status)}
                      </span>

                      {/*
                        BADGE DE PRIORIDADE
                        getPriorityBadge retorna { label, classes } —
                        desestruturamos direto para usar as duas propriedades
                      */}
                      {ticket.priority && (() => {
                        const { label, classes } = getPriorityBadge(ticket.priority);
                        return (
                          <span
                            data-cy="ticket-priority-badge"
                            className={`px-3 py-1 text-xs rounded-full font-medium ${classes}`}
                          >
                            {label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* DESCRIÇÃO */}
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {ticket.description}
                  </p>

                  {/* AUTOR + DATA */}
                  <p className="mt-3 text-xs text-gray-500">
                    <span>
                      Criado por: {ticket.author?.name || ticket.author?.email || 'Desconhecido'}
                    </span>
                    {" "} em {" "}
                    <span className="text-gray-400">
                      {new Date(ticket.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </p>

                  <p className="mt-2 text-xs text-gray-500">
                    Responsável: <span className="text-gray-300">{ticket.agent?.name || ticket.agent?.email || 'Não atribuído'}</span>
                  </p>

                  {/* CONTROLES (dono ou AGENT) */}
                  {(session?.user?.id === ticket.authorId || session?.user?.role === 'AGENT') && (
                    <div className="mt-4 flex flex-col gap-3">

                      {/* SELECT STATUS (agora pequeno e minimalista) */}
                      {session?.user?.role === 'AGENT' && <label className="flex flex-col gap-1 text-sm text-gray-300">
                        Status
                      <select
                        data-cy={`ticket-${ticket.id}-status`}
                        disabled={updatingId === ticket.id}
                        value={ticket.status}
                        onChange={(e) =>
                          handleStatusChange(ticket.id, e.target.value)
                        }
                        className="bg-gray-700 text-white px-3 py-2 rounded-md text-sm border border-gray-600 w-40"
                      >
                        <option value="OPEN">Aberto</option>
                        <option value="IN_PROGRESS">Em Progresso</option>
                        <option value="CLOSED">Fechado</option>
                      </select>
                      </label>}

                      {session?.user?.role === 'AGENT' && (
                        <label className="flex flex-col gap-1 text-sm text-gray-300">
                          Responsável
                          <select
                            data-cy={`ticket-${ticket.id}-agent`}
                            disabled={updatingId === ticket.id}
                            value={ticket.agentId || ''}
                            onChange={(e) => handleAgentChange(ticket.id, e.target.value)}
                            className="bg-gray-700 text-white px-3 py-2 rounded-md text-sm border border-gray-600 w-56"
                          >
                            <option value="">Não atribuído</option>
                            {agents.map((agent) => (
                              <option key={agent.id} value={agent.id}>
                                {agent.name || agent.email}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}

                      {/* EDITAR + EXCLUIR */}
                      <div className="flex gap-4 text-sm">
                        <Link
                          data-cy={`ticket-${ticket.id}-edit-link`}
                          href={`/dashboard/ticket/${ticket.id}/edit`}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          Editar
                        </Link>

                        <button
                          data-cy={`ticket-${ticket.id}-delete`}
                          onClick={() => handleDelete(ticket.id)}
                          disabled={deletingId === ticket.id}
                          className="text-red-400 hover:text-red-300 disabled:opacity-50"
                        >
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
