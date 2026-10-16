'use client';

import { useState } from 'react';
import { useTheme } from './ThemeProvider';

export default function EditTicketForm({ ticket, onTicketUpdated, isAgent = false, agents = [] }) {
    const { theme } = useTheme();
    // Inicializa cada estado com o valor atual do ticket
    // Assim o formulário já abre preenchido com os dados existentes
    const [title, setTitle] = useState(ticket.title);
    const [description, setDescription] = useState(ticket.description);
    const [status, setStatus] = useState(ticket.status);
    const [priority, setPriority] = useState(ticket.priority || 'MEDIUM');
    const [agentId, setAgentId] = useState(ticket.agentId || '');
    // Prazo separado em Data + Hora: mais claro que o datetime-local único.
    const pad2 = (n) => String(n).padStart(2, '0');
    const splitDue = (v) => {
        if (!v) return { date: '', time: '' };
        const d = new Date(v);
        if (Number.isNaN(d.getTime())) return { date: '', time: '' };
        return {
            date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
            time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
        };
    };
    const initialDue = splitDue(ticket.dueAt);
    const [dueDate, setDueDate] = useState(initialDue.date);
    const [dueTime, setDueTime] = useState(initialDue.time || '09:00');
    const [recalcDue, setRecalcDue] = useState(false);
    const todayStr = (() => {
        const t = new Date();
        return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`;
    })();
    // Resumo legível do prazo escolhido (ex: "Segunda, 20/10 às 14:30").
    const dueSummary = (() => {
        if (!dueDate) return '';
        const d = new Date(dueTime ? `${dueDate}T${dueTime}` : `${dueDate}T00:00`);
        if (Number.isNaN(d.getTime())) return '';
        const dia = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
        const hora = dueTime || '00:00';
        const diffDays = Math.ceil((d.getTime() - Date.now()) / 86400000);
        const resto = diffDays <= 0 ? ' (hoje)' : diffDays === 1 ? ' (amanhã)' : ` (faltam ${diffDays} dias)`;
        return `${dia} às ${hora}${resto}`;
    })();
    // Flag: prazo no passado (comparação só de data, sem hora).
    // Evita que o resumo minta "(hoje)" quando digitam data anterior.
    const isPastDue = (() => {
        if (!dueDate) return false;
        return dueDate < todayStr;
    })();
    // Opções de hora em blocos de 30 min.
    const timeOptions = (() => {
        const opts = [];
        for (let h = 0; h < 24; h++) {
            for (const m of [0, 30]) opts.push(`${pad2(h)}:${pad2(m)}`);
        }
        return opts;
    })();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (dueDate && dueDate < todayStr) {
            setError('O prazo deve ser hoje ou uma data futura.');
            return;
        }
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`/api/tickets/${ticket.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(isAgent
                    ? (() => {
                        const duePayload = {};
                        if (dueDate) {
                            duePayload.dueAt = dueTime ? `${dueDate}T${dueTime}` : dueDate;
                        }
                        return { title, description, status, priority, agentId: agentId || null, ...duePayload, recalcDue };
                    })()
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
                    className={`block w-full rounded-xl border px-3.5 py-2.5 text-sm transition focus:outline-none focus:ring-2 ${
                        theme === 'light'
                            ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-400/20'
                            : 'bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 focus:bg-slate-800 focus:border-emerald-400 focus:ring-emerald-400/20'
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
                    className={`block w-full rounded-xl border px-3.5 py-2.5 text-sm leading-relaxed transition focus:outline-none focus:ring-2 ${
                        theme === 'light'
                            ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-400/20'
                            : 'bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 focus:bg-slate-800 focus:border-emerald-400 focus:ring-emerald-400/20'
                    }`}
                    required
                ></textarea>
            </div>

            {/* STATUS + PRIORIDADE + RESPONSÁVEL lado a lado em telas maiores */}
            {isAgent && (
                <div className="space-y-4">
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
                                className={`block w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 ${
                                    theme === 'light'
                                        ? 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500 focus:ring-emerald-400/20'
                                        : 'bg-slate-800/60 border-slate-700 text-white focus:bg-slate-800 focus:border-emerald-400 focus:ring-emerald-400/20'
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
                                className={`block w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 ${
                                    theme === 'light'
                                        ? 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500 focus:ring-emerald-400/20'
                                        : 'bg-slate-800/60 border-slate-700 text-white focus:bg-slate-800 focus:border-emerald-400 focus:ring-emerald-400/20'
                                }`}
                            >
                                <option value="LOW">Baixa</option>
                                <option value="MEDIUM">Média</option>
                                <option value="HIGH">Alta</option>
                                <option value="URGENT">Urgente</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="agentId" className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                            theme === 'light' ? 'text-slate-700' : 'text-slate-300'
                        }`}>
                            Responsável pelo Chamado
                        </label>
                        <select
                            data-cy="ticket-edit-agent"
                            id="agentId"
                            value={agentId}
                            onChange={(e) => setAgentId(e.target.value)}
                            className={`block w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 ${
                                theme === 'light'
                                    ? 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500 focus:ring-emerald-400/20'
                                    : 'bg-slate-800/60 border-slate-700 text-white focus:bg-slate-800 focus:border-emerald-400 focus:ring-emerald-400/20'
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

                                        <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="dueDate" className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>Data do prazo</label>
                            <input data-cy="ticket-edit-duedate" type="date" id="dueDate" value={dueDate} min={todayStr} onChange={(e) => setDueDate(e.target.value)} className={`block w-full rounded-xl border px-3.5 py-2.5 text-sm transition focus:outline-none focus:ring-2 ${theme === 'light' ? 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500 focus:ring-emerald-400/20' : 'bg-slate-800/60 border-slate-700 text-white focus:bg-slate-800 focus:border-emerald-400 focus:ring-emerald-400/20'}`} />
                        </div>
                        <div>
                            <label htmlFor="dueTime" className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>Hora do prazo</label>
                            <select data-cy="ticket-edit-duetime" id="dueTime" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className={`block w-full rounded-xl border px-3.5 py-2.5 text-sm transition focus:outline-none focus:ring-2 ${theme === 'light' ? 'bg-white border-slate-300 text-slate-900 focus:border-emerald-500 focus:ring-emerald-400/20' : 'bg-slate-800/60 border-slate-700 text-white focus:bg-slate-800 focus:border-emerald-400 focus:ring-emerald-400/20'}`}>
                                <option value="">Sem hora definida</option>
                                {timeOptions.map((t) => (<option key={t} value={t}>{t}</option>))}
                            </select>
                        </div>
                    </div>
                    {dueSummary && (<p data-cy="ticket-edit-due-summary" className={`mt-2 rounded-lg px-3 py-2 text-xs font-medium ${isPastDue ? (theme === 'light' ? 'bg-red-50 text-red-700' : 'bg-red-950/40 text-red-300') : (theme === 'light' ? 'bg-emerald-50 text-emerald-700' : 'bg-emerald-950/40 text-emerald-300')}`}>{isPastDue ? `Data no passado — escolha hoje ou uma data futura.` : `Prazo: ${dueSummary}`}</p>)}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        <button type="button" data-cy="chip-amanha" onClick={() => { const b = new Date(); b.setDate(b.getDate() + 1); setDueDate(b.getFullYear() + '-' + pad2(b.getMonth() + 1) + '-' + pad2(b.getDate())); if (!dueTime) setDueTime('09:00'); }} className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${theme === 'light' ? 'border-slate-300 bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300' : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-emerald-950/40 hover:text-emerald-300 hover:border-emerald-800'}`}>Amanhã</button>
                    </div>
<div className="flex items-end pb-1">
                            <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                                <input
                                    data-cy="ticket-edit-recalc"
                                    type="checkbox"
                                    checked={recalcDue}
                                    onChange={(e) => setRecalcDue(e.target.checked)}
                                    className="h-4 w-4 rounded accent-emerald-600"
                                />
                                <span className={theme === 'light' ? 'text-slate-700' : 'text-slate-300'}>
                                    Recalcular prazo ao trocar a prioridade
                                </span>
                            </label>
                        </div>
                    </div>
            )}

            <div className="mt-8 flex justify-end">
                <button
                    data-cy="ticket-edit-submit"
                    type="submit"
                    disabled={loading || isPastDue}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 text-sm font-semibold shadow-xs transition active:scale-[0.99] disabled:opacity-50"
                >
                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>
        </form>
    );
}
