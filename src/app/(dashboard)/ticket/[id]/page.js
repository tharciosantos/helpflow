'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { 
    LuArrowLeft, 
    LuUser, 
    LuCalendar, 
    LuShield, 
    LuClock, 
    LuPencil, 
    LuTrash2 
} from 'react-icons/lu';
import { getStatusDisplayNamePT, getStatusBadgeClasses, getPriorityBadge } from '@/lib/ticketUtils';
import { useTheme } from '../../../components/ThemeProvider';

export default function TicketDetailsPage() {
    const { theme } = useTheme();
    const { data: session, status: sessionStatus } = useSession();
    const { id } = useParams();
    const router = useRouter();

    const [ticket, setTicket] = useState(null);
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [newStatus, setNewStatus] = useState('OPEN');
    const [newPriority, setNewPriority] = useState('MEDIUM');
    const [newAgentId, setNewAgentId] = useState('');
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
            setNewPriority(data.priority ?? 'MEDIUM');
            setNewAgentId(data.agentId ?? '');
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

    useEffect(() => {
        if (session?.user?.role === 'AGENT') {
            const fetchAgents = async () => {
                try {
                    const res = await fetch('/api/agents');
                    if (res.ok) {
                        setAgents(await res.json());
                    }
                } catch (err) {
                    console.error('Erro ao buscar membros:', err);
                }
            };
            fetchAgents();
        }
    }, [session?.user?.role]);

    const handleQuickUpdate = async () => {
        setError('');
        setSuccess('');
        setIsUpdating(true);
        try {
            const res = await fetch(`/api/tickets/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: newStatus,
                    priority: newPriority,
                    agentId: newAgentId || null,
                }),
            });
            if (!res.ok) {
                const body = await res.json();
                throw new Error(body.message || 'Falha ao atualizar o ticket.');
            }
            const updated = await res.json();
            setTicket(updated);
            setNewStatus(updated.status);
            setNewPriority(updated.priority);
            setNewAgentId(updated.agentId || '');
            setSuccess('Chamado atualizado com sucesso.');
        } catch (err) {
            console.error('Erro ao atualizar ticket:', err);
            setError(err.message || 'Erro ao atualizar chamado.');
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
            <main aria-label="Carregando detalhes do ticket" aria-busy="true" className={`max-w-4xl mx-auto space-y-6 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                <div className={`animate-pulse rounded-2xl p-8 border ${
                    theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
                }`}>
                    <div className={`h-7 w-2/3 rounded-lg ${theme === 'light' ? 'bg-slate-200' : 'bg-slate-800'}`} />
                    <div className={`mt-6 h-20 w-full rounded-xl ${theme === 'light' ? 'bg-slate-100' : 'bg-slate-800/60'}`} />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className={`h-16 rounded-xl ${theme === 'light' ? 'bg-slate-100' : 'bg-slate-800/40'}`} />
                        ))}
                    </div>
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
        <main className={`max-w-4xl mx-auto space-y-6 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
            <div>
                <Link 
                    href="/dashboard" 
                    data-cy="ticket-detail-back-link" 
                    className={`inline-flex items-center gap-2 text-sm font-medium transition ${
                        theme === 'light' ? 'text-slate-500 hover:text-emerald-600' : 'text-slate-400 hover:text-emerald-400'
                    }`}
                >
                    <LuArrowLeft size={16} />
                    Voltar para a lista
                </Link>
            </div>

            <div className={`rounded-2xl border shadow-sm p-6 sm:p-8 space-y-6 ${
                theme === 'light'
                    ? 'bg-white border-slate-200'
                    : 'bg-slate-900/90 border-slate-800'
            }`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                        <span className={`inline-flex items-center font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                            theme === 'light' 
                                ? 'bg-slate-100 text-slate-600 border-slate-200' 
                                : 'bg-slate-800/80 text-slate-300 border-slate-700'
                        }`}>
                            #{ticket.id.slice(-6)}
                        </span>
                        <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${
                            theme === 'light' ? 'text-slate-900' : 'text-white'
                        }`}>
                            {ticket.title}
                        </h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <span className={`px-3 py-1 text-xs sm:text-sm font-semibold rounded-full ${getStatusBadgeClasses(ticket.status, theme)}`}>
                            {getStatusDisplayNamePT(ticket.status)}
                        </span>
                        {ticket.priority && (() => {
                            const { label, classes } = getPriorityBadge(ticket.priority, theme);
                            return (
                                <span className={`px-3 py-1 text-xs sm:text-sm font-semibold rounded-full ${classes}`}>
                                    {label}
                                </span>
                            );
                        })()}
                    </div>
                </div>

                <div className={`rounded-xl p-5 border ${
                    theme === 'light'
                        ? 'bg-slate-50 border-slate-200 text-slate-800'
                        : 'bg-slate-950/40 border-slate-800/80 text-slate-200'
                }`}>
                    <h3 className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${
                        theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                        Descrição do Chamado
                    </h3>
                    <p className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
                        {ticket.description}
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                    <div className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                        theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/50'
                    }`}>
                        <div className={`p-2 rounded-lg ${
                            theme === 'light' ? 'bg-blue-50 text-blue-600' : 'bg-blue-950/50 text-blue-400'
                        }`}>
                            <LuUser size={16} />
                        </div>
                        <div className="min-w-0">
                            <span className="block text-[11px] font-medium text-slate-400">Criado por</span>
                            <span className="block text-xs font-semibold truncate" title={ticket.author?.name || 'Desconhecido'}>
                                {ticket.author?.name || 'Desconhecido'}
                            </span>
                        </div>
                    </div>

                    <div className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                        theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/50'
                    }`}>
                        <div className={`p-2 rounded-lg ${
                            theme === 'light' ? 'bg-blue-50 text-blue-600' : 'bg-blue-950/50 text-blue-400'
                        }`}>
                            <LuCalendar size={16} />
                        </div>
                        <div className="min-w-0">
                            <span className="block text-[11px] font-medium text-slate-400">Criado em</span>
                            <span className="block text-xs font-semibold truncate">
                                {new Date(ticket.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                        </div>
                    </div>

                    <div className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                        theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/50'
                    }`}>
                        <div className={`p-2 rounded-lg ${
                            theme === 'light' ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-950/50 text-emerald-400'
                        }`}>
                            <LuShield size={16} />
                        </div>
                        <div className="min-w-0">
                            <span className="block text-[11px] font-medium text-slate-400">Responsável</span>
                            <span className="block text-xs font-semibold truncate" title={ticket.agent?.name || 'Não atribuído'}>
                                {ticket.agent?.name || 'Não atribuído'}
                            </span>
                        </div>
                    </div>

                    <div className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                        theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/50'
                    }`}>
                        <div className={`p-2 rounded-lg ${
                            theme === 'light' ? 'bg-amber-50 text-amber-600' : 'bg-amber-950/50 text-amber-400'
                        }`}>
                            <LuClock size={16} />
                        </div>
                        <div className="min-w-0">
                            <span className="block text-[11px] font-medium text-slate-400">Atualizado em</span>
                            <span className="block text-xs font-semibold truncate">
                                {new Date(ticket.updatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {(session?.user?.role === 'AGENT' || session?.user?.id === ticket.authorId) && (
                <div className={`p-6 sm:p-8 rounded-2xl border shadow-sm space-y-4 ${
                    theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800'
                }`}>
                    <div>
                        <h2 className="text-lg font-bold">Ações do Ticket</h2>
                        <p className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                            Gerencie o andamento e as opções deste chamado
                        </p>
                    </div>

                    {session?.user?.role === 'AGENT' && (
                        <div className="space-y-4 pt-2">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {/* STATUS */}
                                <div className="space-y-1.5">
                                    <label htmlFor="ticket-status-select" className={`block text-xs font-semibold uppercase tracking-wider ${
                                        theme === 'light' ? 'text-slate-600' : 'text-slate-300'
                                    }`}>
                                        Status
                                    </label>
                                    <select
                                        id="ticket-status-select"
                                        data-cy="ticket-detail-status"
                                        value={newStatus}
                                        onChange={(e) => setNewStatus(e.target.value)}
                                        className={`w-full border rounded-xl py-2 px-3 text-sm font-medium focus:outline-none focus:ring-2 ${
                                            theme === 'light'
                                                ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500 focus:ring-emerald-400/20'
                                                : 'bg-slate-800 border-slate-700 text-white focus:border-emerald-400 focus:ring-emerald-400/20'
                                        }`}
                                        disabled={isUpdating}
                                    >
                                        <option value="OPEN">Aberto</option>
                                        <option value="IN_PROGRESS">Em Progresso</option>
                                        <option value="CLOSED">Fechado</option>
                                    </select>
                                </div>

                                {/* PRIORIDADE */}
                                <div className="space-y-1.5">
                                    <label htmlFor="ticket-priority-select" className={`block text-xs font-semibold uppercase tracking-wider ${
                                        theme === 'light' ? 'text-slate-600' : 'text-slate-300'
                                    }`}>
                                        Prioridade
                                    </label>
                                    <select
                                        id="ticket-priority-select"
                                        data-cy="ticket-detail-priority"
                                        value={newPriority}
                                        onChange={(e) => setNewPriority(e.target.value)}
                                        className={`w-full border rounded-xl py-2 px-3 text-sm font-medium focus:outline-none focus:ring-2 ${
                                            theme === 'light'
                                                ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500 focus:ring-emerald-400/20'
                                                : 'bg-slate-800 border-slate-700 text-white focus:border-emerald-400 focus:ring-emerald-400/20'
                                        }`}
                                        disabled={isUpdating}
                                    >
                                        <option value="LOW">Baixa</option>
                                        <option value="MEDIUM">Média</option>
                                        <option value="HIGH">Alta</option>
                                        <option value="URGENT">Urgente</option>
                                    </select>
                                </div>

                                {/* RESPONSÁVEL */}
                                <div className="space-y-1.5">
                                    <label htmlFor="ticket-agent-select" className={`block text-xs font-semibold uppercase tracking-wider ${
                                        theme === 'light' ? 'text-slate-600' : 'text-slate-300'
                                    }`}>
                                        Responsável
                                    </label>
                                    <select
                                        id="ticket-agent-select"
                                        data-cy="ticket-detail-agent"
                                        value={newAgentId}
                                        onChange={(e) => setNewAgentId(e.target.value)}
                                        className={`w-full border rounded-xl py-2 px-3 text-sm font-medium focus:outline-none focus:ring-2 ${
                                            theme === 'light'
                                                ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500 focus:ring-emerald-400/20'
                                                : 'bg-slate-800 border-slate-700 text-white focus:border-emerald-400 focus:ring-emerald-400/20'
                                        }`}
                                        disabled={isUpdating}
                                    >
                                        <option value="">Não atribuído</option>
                                        {agents.map((member) => (
                                            <option key={member.id} value={member.id}>
                                                {member.name || member.email} {member.role === 'AGENT' ? '(TI / Suporte)' : '(Funcionário)'}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/80">
                        <div className="flex flex-wrap items-center gap-2">
                            {session?.user?.role === 'AGENT' && (
                                <button
                                    disabled={isUpdating}
                                    data-cy="ticket-detail-status-submit"
                                    onClick={handleQuickUpdate}
                                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-wait shadow-sm inline-flex items-center gap-2"
                                >
                                    {isUpdating ? 'Salvando...' : 'Salvar Alterações Rápidas'}
                                </button>
                            )}

                            <Link
                                href={`/dashboard/ticket/${ticket.id}/edit`}
                                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
                                    theme === 'light'
                                        ? 'border-slate-300 bg-white hover:border-emerald-500 hover:text-emerald-600 text-slate-700 shadow-sm'
                                        : 'border-slate-700 bg-slate-800/80 hover:border-emerald-400 hover:text-emerald-300 text-slate-200 shadow-sm'
                                }`}
                            >
                                <LuPencil size={15} />
                                Editar Informações Completas
                            </Link>
                        </div>

                        <button
                            data-cy="ticket-detail-delete"
                            onClick={handleDeleteTicket}
                            disabled={isDeleting}
                            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                                isDeleting
                                    ? 'opacity-50 cursor-not-allowed border-slate-300 text-slate-400'
                                    : theme === 'light'
                                        ? 'border-red-200 bg-red-50/60 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 shadow-sm'
                                        : 'border-red-900/60 bg-red-950/40 text-red-400 hover:bg-red-600 hover:text-white hover:border-red-600 shadow-sm'
                            }`}
                        >
                            <LuTrash2 size={16} />
                            {isDeleting ? 'Deletando...' : 'Deletar Ticket'}
                        </button>
                    </div>

                    {error && <p role="alert" className={`text-sm mt-2 ${theme === 'light' ? 'text-red-600' : 'text-red-500'}`}>{error}</p>}
                    {success && <p role="status" className={`text-sm mt-2 ${theme === 'light' ? 'text-emerald-700' : 'text-emerald-300'}`}>{success}</p>}
                </div>
            )}
        </main>
    );
}
