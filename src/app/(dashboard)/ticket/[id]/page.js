'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { getStatusDisplayNamePT, getStatusBadgeClasses, getPriorityBadge } from '@/lib/ticketUtils';
import { useTheme } from '../../../components/ThemeProvider';

export default function TicketDetailsPage() {
    const { theme } = useTheme();
    const { data: session, status: sessionStatus } = useSession();
    const { id } = useParams();
    const router = useRouter();

    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [newStatus, setNewStatus] = useState('OPEN');
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [success, setSuccess] = useState('');

    const fetchTicket = useCallback(async () => {
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const res = await fetch(`/api/tickets/${id}`);
            if (!res.ok) {
                if (res.status === 404) throw new Error('Ticket não encontrado');
                if (res.status === 401 || res.status === 403) throw new Error('Não autorizado');
                throw new Error('Falha ao buscar o ticket');
            }
            const data = await res.json();
            setTicket(data);
            setNewStatus(data.status ?? 'OPEN');
        } catch (err) {
            console.error('Erro ao buscar ticket:', err);
            setError(err.message || 'Erro ao buscar o ticket');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (id) fetchTicket();
    }, [id, fetchTicket]);

    const handleStatusUpdate = async () => {
        if (!['OPEN', 'IN_PROGRESS', 'CLOSED'].includes(newStatus)) {
            return setError('Selecione um status válido');
        }
        setError('');
        setSuccess('');
        setIsUpdating(true);
        try {
            const res = await fetch(`/api/tickets/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) {
                if (res.status === 400) {
                    const body = await res.json();
                    throw new Error(body.message || 'Status inválido');
                }
                if (res.status === 403 || res.status === 401) throw new Error('Não autorizado');
                throw new Error('Falha ao atualizar o status');
            }
            const updated = await res.json();
            setTicket(updated);
            setNewStatus(updated.status);
            setSuccess('Status atualizado com sucesso.');
        } catch (err) {
            console.error('Erro ao atualizar status:', err);
            setError(err.message || 'Erro ao atualizar status');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteTicket = async () => {
        if (!confirm('Tem certeza que deseja deletar este ticket? Esta ação não pode ser desfeita.')) return;
        setIsDeleting(true);
        setError('');
        try {
            const res = await fetch(`/api/tickets/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                if (res.status === 404) throw new Error('Ticket não encontrado para exclusão.');
                if (res.status === 403 || res.status === 401) throw new Error('Não autorizado para deletar.');
                throw new Error('Falha ao deletar o ticket.');
            }
            router.push('/dashboard');
            router.refresh();
        } catch (err) {
            console.error('Erro ao deletar ticket:', err);
            setError(err.message || 'Erro ao deletar o ticket.');
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading || sessionStatus === 'loading') {
        return (
            <main aria-label="Carregando detalhes do ticket" aria-busy="true" className={`mx-auto max-w-4xl p-8 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                <div className={`animate-pulse rounded-xl p-6 border ${
                    theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-gray-800 border-gray-700'
                }`}>
                    <div className={`h-8 w-2/3 rounded ${theme === 'light' ? 'bg-slate-200' : 'bg-gray-700'}`} />
                    <div className={`mt-8 h-4 w-full rounded ${theme === 'light' ? 'bg-slate-200' : 'bg-gray-700'}`} />
                    <div className={`mt-3 h-4 w-4/5 rounded ${theme === 'light' ? 'bg-slate-200' : 'bg-gray-700'}`} />
                    <div className={`mt-8 h-4 w-1/2 rounded ${theme === 'light' ? 'bg-slate-200' : 'bg-gray-700'}`} />
                </div>
            </main>
        );
    }

    if (error && !ticket && !isDeleting) {
        return <div className={`p-8 text-center ${theme === 'light' ? 'text-red-600' : 'text-red-400'}`}>{error}</div>;
    }

    if (!ticket) {
        return <div className={`p-8 text-center ${theme === 'light' ? 'text-slate-500' : 'text-gray-400'}`}>Ticket não encontrado.</div>;
    }

    return (
        <main className={`min-h-screen p-8 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
            <div className="max-w-4xl mx-auto">
                <Link href="/dashboard" data-cy="ticket-detail-back-link" className={`mb-8 block font-medium ${
                    theme === 'light' ? 'text-teal-600 hover:text-teal-500' : 'text-teal-400 hover:text-teal-300'
                }`}>&larr; Voltar para a lista</Link>
                <div className={`p-6 rounded-lg shadow-md border ${
                    theme === 'light' ? 'bg-white border-slate-200' : 'bg-gray-800 border-gray-700'
                }`}>
                    <div className="flex justify-between items-start mb-4">
                        <h1 className="text-3xl font-bold">{ticket.title}</h1>
                        <div className="flex items-center gap-2">
                            {/* Badge de status */}
                            <span className={`px-3 py-1 text-sm font-bold rounded-full ${getStatusBadgeClasses(ticket.status, theme)}`}>
                                {getStatusDisplayNamePT(ticket.status)}
                            </span>
                            {/* Badge de prioridade */}
                            {ticket.priority && (() => {
                                const { label, classes } = getPriorityBadge(ticket.priority, theme);
                                return (
                                    <span className={`px-3 py-1 text-sm font-bold rounded-full ${classes}`}>
                                        {label}
                                    </span>
                                );
                            })()}
                        </div>
                    </div>
                    <div className={`border-t my-4 ${theme === 'light' ? 'border-slate-200' : 'border-gray-700'}`}></div>
                    <p className={`whitespace-pre-wrap ${theme === 'light' ? 'text-slate-700' : 'text-gray-300'}`}>{ticket.description}</p>
                    <div className={`mt-6 flex flex-col gap-2 text-sm sm:flex-row sm:justify-between ${
                        theme === 'light' ? 'text-slate-500' : 'text-gray-400'
                    }`}>
                        <span>Criado por: {ticket.author?.name || 'Desconhecido'}</span>
                        <span>Em: {new Date(ticket.createdAt).toLocaleString()}</span>
                    </div>
                    <div className={`mt-2 flex flex-col gap-2 text-sm sm:flex-row sm:justify-between ${
                        theme === 'light' ? 'text-slate-500' : 'text-gray-400'
                    }`}>
                        <span>Responsável: {ticket.agent?.name || ticket.agent?.email || 'Não atribuído'}</span>
                        <span>Atualizado em: {new Date(ticket.updatedAt).toLocaleString()}</span>
                    </div>
                </div>

                {(session?.user?.role === 'AGENT' || session?.user?.id === ticket.authorId) && (
                    <div className={`mt-6 p-6 rounded-lg shadow-md border ${
                        theme === 'light' ? 'bg-white border-slate-200' : 'bg-gray-800 border-gray-700'
                    }`}>
                        <h2 className="text-xl font-bold mb-4">Ações do ticket</h2>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                            {session?.user?.role === 'AGENT' && <div className="flex items-end gap-2">
                                <label className={`flex flex-col gap-1 text-sm ${
                                    theme === 'light' ? 'text-slate-700' : 'text-gray-300'
                                }`}>Status
                                <select
                                    data-cy="ticket-detail-status"
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                    className={`border rounded-md py-2 px-3 focus:outline-none ${
                                        theme === 'light'
                                            ? 'bg-white border-slate-300 text-slate-900'
                                            : 'bg-gray-700 border-gray-600 text-white'
                                    }`}
                                    disabled={isUpdating}
                                >
                                    <option value="OPEN">Aberto</option>
                                    <option value="IN_PROGRESS">Em Progresso</option>
                                    <option value="CLOSED">Fechado</option>
                                </select>
                                </label>
                                <button disabled={isUpdating} data-cy="ticket-detail-status-submit" onClick={handleStatusUpdate} className="h-10 rounded-md bg-teal-600 px-4 font-semibold hover:bg-teal-700 disabled:cursor-wait disabled:opacity-50">{isUpdating ? 'Atualizando...' : 'Atualizar status'}</button>
                            </div>}

                            <button
                                data-cy="ticket-detail-delete"
                                onClick={handleDeleteTicket}
                                disabled={isDeleting}
                                className={`h-10 self-start rounded-md px-4 font-semibold sm:self-end ${isDeleting ? 'bg-gray-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                            >
                                {isDeleting ? 'Deletando...' : 'Deletar Ticket'}
                            </button>
                        </div>
                        {error && <p role="alert" className={`text-sm mt-2 ${theme === 'light' ? 'text-red-600' : 'text-red-500'}`}>{error}</p>}
                        {success && <p role="status" className={`text-sm mt-2 ${theme === 'light' ? 'text-teal-700' : 'text-teal-300'}`}>{success}</p>}
                    </div>
                )}
            </div>
        </main>
    );
}
