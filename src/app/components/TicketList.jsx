"use client";

import Link from "next/link";
import { useState } from "react";

const getStatusDisplayNamePT = (status) => {
  switch (status) {
    case "OPEN":
      return "Aberto";
    case "IN_PROGRESS":
      return "Em Progresso";
    case "CLOSED":
      return "Fechado";
    default:
      return status;
  }
};

export default function TicketList({
  tickets,
  loading,
  error,
  onTicketDeleted,
  onTicketUpdated,
  session,
}) {
  const [deletingId, setDeletingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // ======================= DELETE =========================
  const handleDelete = async (ticketId) => {
    if (window.confirm("Tem certeza que deseja excluir este ticket?")) {
      setDeletingId(ticketId);
      try {
        const res = await fetch(`/api/tickets/${ticketId}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          throw new Error("Falha ao excluir o ticket.");
        }

        onTicketDeleted?.(ticketId);
      } catch (err) {
        setErrorMessage(err.message || 'Erro ao excluir o ticket.');
      } finally {
        setDeletingId(null);
      }
    }
  };

  // ======================= UPDATE STATUS =========================
  const handleStatusChange = async (ticketId, newStatus) => {
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
    } catch (err) {
      setErrorMessage(err.message || 'Erro ao excluir o ticket.');
    } finally {
      setUpdatingId(null);
    }
  };

  // ======================= LOADING / ERROR =========================
  if (loading) {
    return (
      <p className="text-center text-gray-400 mt-12">Carregando tickets...</p>
    );
  }

  if (error) {
    return <p className="text-center text-red-500 mt-12">{error}</p>;
  }

  // ======================= UI =========================
  return (
    <>
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-900/40 border border-red-700 rounded-lg text-sm text-red-300 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage('')}
            className="ml-4 text-red-400 hover:text-red-200 font-bold"
          >
            ✕
          </button>
        </div>
      )}
      <div className="mt-12">
        <h2 className="text-2xl font-semibold mb-6 text-white">
          Meus tickets
        </h2>

        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-gray-400 mb-3">
              Você ainda não tem nenhum ticket aberto.
            </p>
            <Link
              data-cy="ticket-empty-create-link"
              href="/dashboard/tickets/new"
              className="inline-flex items-center justify-center rounded-md bg-teal-500 px-4 py-2 text-sm font-medium text-white hover:bg-teal-400 transition"
            >
              + Criar primeiro ticket
            </Link>
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

                  {/* TÍTULO + STATUS */}
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

                    {/* BADGE MINIMALISTA */}
                    <span
                      data-cy="ticket-status-badge"
                      className={`
                      px-3 py-1 text-xs rounded-full font-medium
                      ${ticket.status === "OPEN"
                          ? "bg-green-700/40 text-green-300"
                          : ticket.status === "IN_PROGRESS"
                            ? "bg-yellow-600/30 text-yellow-300"
                            : "bg-gray-600/40 text-gray-300"
                        }
                    `}
                    >
                      {getStatusDisplayNamePT(ticket.status)}
                    </span>
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

                  {/* CONTROLES (dono ou AGENT) */}
                  {(session?.user?.id === ticket.authorId || session?.user?.role === 'AGENT') && (
                    <div className="mt-4 flex flex-col gap-3">

                      {/* SELECT STATUS (agora pequeno e minimalista) */}
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
