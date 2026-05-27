'use client';

import { useState } from 'react';

export default function EditTicketForm({ ticket, onTicketUpdated }) {
    // Inicializa cada estado com o valor atual do ticket
    // Assim o formulário já abre preenchido com os dados existentes
    const [title, setTitle] = useState(ticket.title);
    const [description, setDescription] = useState(ticket.description);
    const [status, setStatus] = useState(ticket.status);
    const [priority, setPriority] = useState(ticket.priority || 'MEDIUM');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`/api/tickets/${ticket.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Envia os 4 campos — a API e o Zod aceitam todos
                body: JSON.stringify({ title, description, status, priority }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Falha ao atualizar o ticket.');
            }

            if (onTicketUpdated) {
                onTicketUpdated();
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && <p className="text-red-500 text-sm">{error}</p>}

            {/* TÍTULO */}
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-300">
                    Título
                </label>
                <input
                    data-cy="ticket-edit-title"
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                    required
                />
            </div>

            {/* DESCRIÇÃO */}
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300">
                    Descrição
                </label>
                <textarea
                    data-cy="ticket-edit-description"
                    id="description"
                    rows="4"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                    required
                ></textarea>
            </div>

            {/* STATUS + PRIORIDADE lado a lado em telas maiores */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-300">
                        Status
                    </label>
                    <select
                        data-cy="ticket-edit-status"
                        id="status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                    >
                        <option value="OPEN">Aberto</option>
                        <option value="IN_PROGRESS">Em Progresso</option>
                        <option value="CLOSED">Fechado</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="priority" className="block text-sm font-medium text-gray-300">
                        Prioridade
                    </label>
                    <select
                        data-cy="ticket-edit-priority"
                        id="priority"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                    >
                        <option value="LOW">🟢 Baixa</option>
                        <option value="MEDIUM">🟡 Média</option>
                        <option value="HIGH">🟠 Alta</option>
                        <option value="URGENT">🔴 Urgente</option>
                    </select>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    data-cy="ticket-edit-submit"
                    type="submit"
                    disabled={loading}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 transition-colors"
                >
                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>
        </form>
    );
}
