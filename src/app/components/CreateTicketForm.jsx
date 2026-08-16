'use client';

import { useState } from 'react';
import { LuSend, LuCircleAlert, LuCircleCheck } from 'react-icons/lu';
import { useTheme } from './ThemeProvider';

export default function CreateTicketForm({ onTicketCreated }) {
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setStatusMessage('Enviando...');

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, priority }),
      });

      if (res.ok) {
        setStatusMessage('Ticket criado com sucesso!');
        setTitle('');
        setDescription('');
        if (onTicketCreated) {
          onTicketCreated();
        }
      } else {
        const error = await res.json();
        setStatusMessage(`Erro: ${error.message || 'Não foi possível criar o ticket.'}`);
      }
    } catch (err) {
      // Erro de rede, timeout, servidor offline, etc.
      setStatusMessage('Erro de conexão. Verifique sua internet e tente novamente.');
      console.error('Erro ao criar ticket:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-2xl border p-6 sm:p-8 shadow-xs transition-colors ${
        theme === 'light'
          ? 'bg-white border-slate-200/90'
          : 'bg-slate-900/80 border-slate-800'
      }`}
    >
      <div className="space-y-5">
        {/* Título */}
        <div>
          <label
            htmlFor="title"
            className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
              theme === 'light' ? 'text-slate-700' : 'text-slate-300'
            }`}
          >
            Título do Chamado <span className="text-red-500">*</span>
          </label>
          <input
            data-cy="ticket-create-title"
            type="text"
            id="title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={5}
            maxLength={100}
            placeholder="Ex: Erro ao emitir relatório mensal no dashboard"
            className={`block w-full rounded-xl border px-3.5 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
              theme === 'light'
                ? 'bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-teal-500'
                : 'bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 focus:bg-slate-800 focus:border-teal-400'
            }`}
          />
          <p className={`mt-1 text-xs ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}>
            Mínimo de 5 caracteres.
          </p>
        </div>

        {/* Descrição */}
        <div>
          <label
            htmlFor="description"
            className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
              theme === 'light' ? 'text-slate-700' : 'text-slate-300'
            }`}
          >
            Descrição Detalhada <span className="text-red-500">*</span>
          </label>
          <textarea
            data-cy="ticket-create-description"
            id="description"
            name="description"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            placeholder="Explique o problema, comportamento esperado ou passos para reproduzir..."
            className={`block w-full rounded-xl border px-3.5 py-2.5 text-sm leading-relaxed transition focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
              theme === 'light'
                ? 'bg-slate-50/50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-teal-500'
                : 'bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500 focus:bg-slate-800 focus:border-teal-400'
            }`}
          />
        </div>

        {/* Prioridade */}
        <div>
          <label
            htmlFor="priority"
            className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
              theme === 'light' ? 'text-slate-700' : 'text-slate-300'
            }`}
          >
            Nível de Prioridade
          </label>
          <select
            data-cy="ticket-create-priority"
            id="priority"
            name="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className={`block w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
              theme === 'light'
                ? 'bg-slate-50/50 border-slate-200 text-slate-900 focus:bg-white focus:border-teal-500'
                : 'bg-slate-800/60 border-slate-700 text-white focus:bg-slate-800 focus:border-teal-400'
            }`}
          >
            <option value="LOW">🟢 Baixa — Dúvidas e solicitações gerais</option>
            <option value="MEDIUM">🟡 Média — Problema que não impede a operação</option>
            <option value="HIGH">🟠 Alta — Impacto direto no fluxo de trabalho</option>
            <option value="URGENT">🔴 Urgente — Sistema indisponível / bloqueio crítico</option>
          </select>
        </div>
      </div>

      {/* Ações */}
      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
        <button
          data-cy="ticket-create-submit"
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-teal-500 active:scale-[0.99] disabled:opacity-50"
        >
          <LuSend size={15} />
          {loading ? 'Criando ticket...' : 'Criar Ticket'}
        </button>
      </div>

      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-4 rounded-xl border p-3 text-sm flex items-center gap-2 ${
            statusMessage.startsWith('Erro')
              ? (theme === 'light' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-red-950/40 border-red-900/60 text-red-300')
              : (theme === 'light' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-950/40 border-emerald-900/60 text-emerald-300')
          }`}
        >
          {statusMessage.startsWith('Erro') ? <LuCircleAlert size={18} /> : <LuCircleCheck size={18} />}
          <span>{statusMessage}</span>
        </div>
      )}
    </form>
  );
}
