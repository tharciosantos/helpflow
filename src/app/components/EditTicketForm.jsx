'use client';

import { useState } from 'react';
import { useTheme } from './ThemeProvider';

export default function EditTicketForm({ ticket, onTicketUpdated, isAgent = false }) {
    const { theme } = useTheme();
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
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(isAgent
                    ? { title, description, status, priority }
                    : { title, description }),
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
        <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
                <div role="alert" className={`rounded-xl border p-3 text-sm ${
                    theme === 'light' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-red-950/40 border-red-900/60 text-red-300'
                }`}>
                    {error}
                </div>
            )}

            {/* TÍTULO */}
            <div>
                <label htmlFor="title" className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                    theme === 'light' ? 'text-slate-700' : 'text-slate-300'
                }`}>
                    Título do Chamado <span className="text-red-500">*</span>
                </label>
                <input
                    data-cy="ticket-edit-title"
                    type="text"
                    id="title"
                    name="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={`block w-full rounded-xl border px-3.5 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
                        theme === 'light'
                            ? 'bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-teal-500'
                            : 'bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 focus:bg-slate-800 focus:border-teal-400'
                    }`}
                    required
                />
            </div>

            {/* DESCRIÇÃO */}
            <div>
                <label htmlFor="description" className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                    theme === 'light' ? 'text-slate-700' : 'text-slate-300'
                }`}>
                    Descrição do Problema <span className="text-red-500">*</span>
                </label>
                <textarea
                    data-cy="ticket-edit-description"
                    id="description"
                    name="description"
                    rows="5"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={`block w-full rounded-xl border px-3.5 py-2.5 text-sm leading-relaxed transition focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
                        theme === 'light'
                            ? 'bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-teal-500'
                            : 'bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 focus:bg-slate-800 focus:border-teal-400'
                    }`}
                    required
                ></textarea>
            </div>

            {/* STATUS + PRIORIDADE lado a lado em telas maiores */}
            {isAgent && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="status" className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                            theme === 'light' ? 'text-slate-700' : 'text-slate-300'
                        }`}>
                            Status
                        </label>
                        <select
                            data-cy="ticket-edit-status"
                            id="status"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className={`block w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
                                theme === 'light'
                                    ? 'bg-slate-50/50 border-slate-200 text-slate-900 focus:bg-white focus:border-teal-500'
                                    : 'bg-slate-800/60 border-slate-700 text-white focus:bg-slate-800 focus:border-teal-400'
                            }`}
                        >
                            <option value="OPEN">Aberto</option>
                            <option value="IN_PROGRESS">Em Progresso</option>
                            <option value="CLOSED">Fechado</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="priority" className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                            theme === 'light' ? 'text-slate-700' : 'text-slate-300'
                        }`}>
                            Prioridade
                        </label>
                        <select
                            data-cy="ticket-edit-priority"
                            id="priority"
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                            className={`block w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
                                theme === 'light'
                                    ? 'bg-slate-50/50 border-slate-200 text-slate-900 focus:bg-white focus:border-teal-500'
                                    : 'bg-slate-800/60 border-slate-700 text-white focus:bg-slate-800 focus:border-teal-400'
                            }`}
                        >
                            <option value="LOW">🟢 Baixa</option>
                            <option value="MEDIUM">🟡 Média</option>
                            <option value="HIGH">🟠 Alta</option>
                            <option value="URGENT">🔴 Urgente</option>
                        </select>
                    </div>
                </div>
            )}

            <div className="mt-8 flex justify-end">
                <button
                    data-cy="ticket-edit-submit"
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-teal-500 active:scale-[0.99] disabled:opacity-50"
                >
                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>
        </form>
    );
}
