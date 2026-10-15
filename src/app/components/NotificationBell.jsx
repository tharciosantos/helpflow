'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { LuBell, LuCheck } from 'react-icons/lu';
import { useTheme } from './ThemeProvider';

const TYPE_LABEL = {
  ASSIGNED: 'Atribuído',
  COMMENT: 'Comentário',
  STATUS: 'Status',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function NotificationBell() {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const load = useCallback(async () => {
    if (!session?.user) return;
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // silencioso: falha de rede nao deve quebrar a experiencia
    }
  }, [session?.user]);

  useEffect(() => {
    if (!session?.user) return;
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load, session?.user]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const markRead = async (id) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // noop
    }
  };

  if (!session?.user) return null;

  const btnBase = theme === 'light'
    ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200';
  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        data-cy="notification-bell"
        aria-label={`Notificações${unreadCount ? ` (${unreadCount} não lidas)` : ''}`}
        onClick={() => { setOpen((o) => !o); if (!open) load(); }}
        className={`relative flex w-full items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${btnBase}`}
      >
        <LuBell size={20} />
        <span>Notificações</span>
        {unreadCount > 0 && (
          <span
            data-cy="notification-badge"
            className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          data-cy="notification-dropdown"
          className={`absolute left-0 z-50 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border shadow-xl ${
            theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-700'
          }`}
        >
          <div className={`flex items-center justify-between border-b px-4 py-3 ${
            theme === 'light' ? 'border-slate-200' : 'border-slate-800'
          }`}>
            <span className="text-sm font-bold">Notificações</span>
            {unreadCount > 0 && (
              <span className="text-xs text-slate-500">{unreadCount} não lida(s)</span>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              Nenhuma notificação por aqui.
            </p>
          ) : (
            <ul className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`px-4 py-3 text-sm ${
                    n.readAt ? '' : theme === 'light' ? 'bg-emerald-50/50' : 'bg-emerald-950/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="mr-2 inline-block rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {TYPE_LABEL[n.type] || n.type}
                      </span>
                      <p className="mt-1 text-slate-700 dark:text-slate-200">{n.message}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{timeAgo(n.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {!n.readAt && (
                        <button
                          type="button"
                          data-cy="notification-mark-read"
                          onClick={() => markRead(n.id)}
                          title="Marcar como lida"
                          className="rounded p-1 text-slate-400 hover:text-emerald-500"
                        >
                          <LuCheck size={14} />
                        </button>
                      )}
                      {n.ticket && (
                        <Link
                          href={`/ticket/${n.ticket.id}`}
                          onClick={() => { markRead(n.id); setOpen(false); }}
                          className="text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
                        >
                          Abrir
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

