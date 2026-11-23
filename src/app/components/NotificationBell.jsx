'use client';

import { useState, useEffect, useCallback, useId, useRef } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useSession } from 'next-auth/react';
import { LuBell, LuCheck, LuCheckCheck, LuCircleAlert, LuX } from 'react-icons/lu';
import { computeNotificationPanelStyle } from '@/lib/notificationPanel';
import {
  classifyLoadResult,
  getConnectionNotice,
  getUnreadSummary,
  nextPollDelay,
  POLL_INTERVAL_MS,
} from '@/lib/notificationConnection';
import { useTheme } from './ThemeProvider';

const TYPE_LABEL = {
  ASSIGNED: 'Atribuído',
  COMMENT: 'Comentário',
  STATUS: 'Status',
};

const TYPE_STYLES = {
  ASSIGNED: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/50',
  COMMENT: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800/50',
  STATUS: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/50',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora mesmo';
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `há ${d}d`;
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// Ordenação garantida no cliente: não lidas primeiro, depois por data (novas primeiro).
// O Postgres usa NULLS LAST no ASC por padrão, então o orderBy simples da API
// (`readAt: "asc"`) colocava as lidas antes das novas — corrigido na API com
// `nulls: "first"`, e aqui mantemos o reforço para qualquer resposta fora de ordem.
function sortNotifications(list) {
  return [...(list || [])].sort((a, b) => {
    const aUnread = !a.readAt ? 0 : 1;
    const bUnread = !b.readAt ? 0 : 1;
    if (aUnread !== bUnread) return aUnread - bUnread;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

// variant="nav"  -> linha completa dentro da SidebarNav (desktop).
// variant="icon" -> botão compacto do header mobile. Precisa ser um componente
// separado da sidebar no mobile: o clique no drawer fecha o menu e desmontaria
// o sino junto (o painel em portal nunca chegaria a abrir).
export default function NotificationBell({ variant = 'nav' }) {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const isIcon = variant === 'icon';
  const panelId = useId();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Falhas consecutivas de carregamento: alimenta o aviso e o backoff.
  const [failures, setFailures] = useState(0);
  const failuresRef = useRef(0);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  // O laço de polling lê o valor mais recente sem reiniciar o efeito.
  useEffect(() => {
    failuresRef.current = failures;
  }, [failures]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Geometria 100% via style inline (sem classes responsivas de posição):
  // as combinações fixed + inset + sm:/md: estavam se anulando no cascade.
  // O cálculo puro fica em @/lib/notificationPanel (coberto por testes).
  const getPanelStyle = useCallback(() => {
    if (typeof window === 'undefined') return { visibility: 'hidden' };
    const button = buttonRef.current;
    const sidebar = button?.closest('aside');
    return computeNotificationPanelStyle({
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      anchorRect: button?.getBoundingClientRect() || null,
      containerRect: sidebar?.getBoundingClientRect() || null,
    });
  }, []);

  const [panelStyle, setPanelStyle] = useState(null);

  useEffect(() => {
    // A declaração vem ANTES dos addEventListener: `const`/`function` em bloco
    // ficam em TDZ até a linha declarada, e lançar ReferenceError aqui impedia
    // o panelStyle de ser aplicado (o aviso de conexão nunca aparecia).
    function handleReposition() {
      setPanelStyle(getPanelStyle());
    }
    if (!open) return;
    setPanelStyle(getPanelStyle());
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [open, getPanelStyle]);

  const load = useCallback(async () => {
    if (!session?.user) return;
    try {
      const res = await fetch('/api/notifications');
      const kind = classifyLoadResult({ ok: res.ok, status: res.status });
      if (kind !== 'success') {
        setFailures((n) => n + 1);
        return;
      }
      const data = await res.json();
      // AUD-42: defesa em profundidade — o GET já omite notificações de
      // chamados inacessíveis, mas uma resposta antiga/cacheada não pode
      // reintroduzir o link que leva a 403.
      setNotifications(sortNotifications((data.notifications || []).filter((n) => n.canOpen !== false)));
      setUnreadCount(data.unreadCount || 0);
      // Sucesso zera o histórico: o próximo poll volta ao intervalo normal.
      setFailures(0);
    } catch {
      // Rede caiu: o aviso no painel é a diferença entre "sem novidades" e
      // "não sabemos", por isso a falha passa a ser visível.
      setFailures((n) => n + 1);
    }
  }, [session?.user]);

  useEffect(() => {
    if (!session?.user) return;

    let cancelled = false;
    let timer = null;

    // Backoff por ref: o timer se reagenda sozinho sem reiniciar o efeito a
    // cada falha (reiniciar duplicaria o polling).
    const tick = async () => {
      if (cancelled) return;
      await load();
      if (cancelled) return;
      timer = setTimeout(tick, nextPollDelay(failuresRef.current));
    };

    load();
    timer = setTimeout(tick, POLL_INTERVAL_MS);

    // Foco/visibilidade forçam uma atualização imediata (e bem-vinda quando a
    // aba volta; se tinha falhado, aqui é a chance de recuperar).
    const onFocus = () => load();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') load();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [load, session?.user]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    // No desktop não há overlay (só mobile), então fecha ao clicar fora.
    const onPointerDown = (e) => {
      if (typeof window !== 'undefined' && window.innerWidth < 768) return;
      const insideTrigger = containerRef.current?.contains(e.target);
      const insidePanel = panelRef.current?.contains(e.target);
      if (!insideTrigger && !insidePanel) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

  const markRead = async (id) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
      // 404 = já estava lida; recarrega para alinhar o badge ao servidor.
      if (!res.ok) {
        if (classifyLoadResult({ ok: false, status: res.status }) === 'failure') {
          setFailures((n) => n + 1);
        }
        load();
        return;
      }
      setNotifications((prev) =>
        sortNotifications(prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      setFailures(0);
    } catch {
      // Rede caiu ao marcar como lida: o badge não pode mentir para o usuário.
      setFailures((n) => n + 1);
    }
  };

  const markAllRead = async () => {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      // Endpoint bulk: o GET lista só 30, mas o servidor marca TODAS.
      const res = await fetch('/api/notifications', { method: 'PATCH' });
      if (!res.ok) throw new Error('Falha ao marcar notificações como lidas.');
      const now = new Date().toISOString();
      setNotifications((prev) => sortNotifications(prev.map((n) => ({ ...n, readAt: n.readAt || now }))));
      setUnreadCount(0);
      setFailures(0);
    } catch {
      // Se falhar, zera o estado local e recarrega para refletir o real.
      setMarkingAll(false);
      setFailures((n) => n + 1);
      load();
      return;
    } finally {
      setMarkingAll(false);
    }
  };

  if (!session?.user) return null;

  const btnBase = isLight
    ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200';
  return (
    <div className={isIcon ? 'relative shrink-0' : 'relative'} ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        data-cy={isIcon ? 'notification-bell-mobile' : 'notification-bell'}
        aria-label={`Notificações${unreadCount ? ` (${unreadCount} não lidas)` : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={panelId}
        onClick={() => { setOpen((o) => !o); if (!open) load(); }}
        className={
          isIcon
            ? `relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-colors ${btnBase}`
            : `relative flex w-full items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${btnBase}`
        }
      >
        <span className="relative shrink-0">
          <LuBell size={isIcon ? 22 : 20} />
          {unreadCount > 0 && (
            <span
              data-cy={isIcon ? 'notification-badge-mobile' : undefined}
              className={`absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ${isIcon ? '' : 'md:hidden'}`}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </span>
        {!isIcon && <span>Notificações</span>}
        {!isIcon && unreadCount > 0 && (
          <span
            data-cy="notification-badge"
            className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && mounted && createPortal(
        <>
          <div
            data-cy="notification-overlay"
            className="fixed inset-0 z-[60] bg-black/60 md:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-label="Notificações"
            data-cy="notification-dropdown"
            style={panelStyle || { visibility: 'hidden' }}
            className={`animate-notification-in flex flex-col overflow-hidden rounded-2xl border shadow-2xl ring-1 ring-black/5 sm:pb-0 dark:ring-white/10 ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-700'
            }`}
          >
            <div className={`flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3.5 ${
              isLight ? 'border-slate-200 bg-slate-50/70' : 'border-slate-800 bg-slate-950/30'
            }`}>
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  isLight ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-950/60 text-emerald-400'
                }`}>
                  <LuBell size={16} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold leading-tight">Notificações</p>
                  <p className="truncate text-[11px] leading-tight text-slate-500 dark:text-slate-400">
                    {getUnreadSummary({ unreadCount, failures })}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    data-cy="notification-mark-all-read"
                    onClick={markAllRead}
                    disabled={markingAll}
                    aria-label={markingAll ? 'Marcando todas como lidas' : 'Marcar todas como lidas'}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                  >
                    <LuCheckCheck size={15} />
                    <span className="hidden min-[420px]:inline">{markingAll ? 'Lendo...' : 'Ler todas'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Fechar notificações"
                  className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <LuX size={18} />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {(() => {
                const notice = getConnectionNotice({ failures, kind: failures > 0 ? 'failure' : 'success' });
                if (!notice) return null;
                return (
                  <div
                    data-cy="notification-connection-warning"
                    role="status"
                    className={`flex items-start gap-2 border-b px-4 py-2.5 text-xs ${
                      isLight
                        ? 'border-amber-200 bg-amber-50 text-amber-800'
                        : 'border-amber-900/60 bg-amber-950/40 text-amber-300'
                    }`}
                  >
                    <LuCircleAlert size={14} className="mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold leading-tight">{notice.title}</p>
                      <p className="mt-0.5 leading-relaxed opacity-90">{notice.description}</p>
                      <button
                        type="button"
                        data-cy="notification-retry"
                        onClick={() => load()}
                        className="mt-1.5 rounded-md border border-amber-400/60 px-2 py-1 text-[11px] font-semibold transition hover:bg-amber-100/60 dark:hover:bg-amber-900/40"
                      >
                        Tentar novamente
                      </button>
                    </div>
                  </div>
                );
              })()}

              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2.5 px-6 py-10 text-center">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    isLight ? 'bg-slate-100 text-slate-400' : 'bg-slate-800/70 text-slate-500'
                  }`}>
                    <LuBell size={22} />
                  </span>
                  <div>
                    <p className={`text-sm font-semibold ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>
                      Nenhuma notificação
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">
                      Quando um chamado for atribuído, comentado ou mudar de status, o aviso aparece aqui.
                    </p>
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      data-cy="notification-item"
                      className={`px-4 py-3.5 text-sm transition-colors ${
                        n.readAt
                          ? isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'
                          : isLight ? 'bg-emerald-50/60 hover:bg-emerald-50' : 'bg-emerald-950/25 hover:bg-emerald-950/35'
                      }`}
                    >
                      <div className="flex min-w-0 items-start justify-between gap-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TYPE_STYLES[n.type] || 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}>
                              {TYPE_LABEL[n.type] || n.type}
                            </span>
                            {!n.readAt && (
                              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-label="Não lida" />
                            )}
                            <span className="ml-auto shrink-0 text-[11px] text-slate-400">{timeAgo(n.createdAt)}</span>
                          </div>
                          <p className="mt-1.5 break-words text-[13px] leading-relaxed text-slate-700 [overflow-wrap:anywhere] dark:text-slate-200">{n.message}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-3">
                            {/* AUD-42: o servidor marca `canOpen: false` quando o
                                usuário perdeu acesso ao chamado (reatribuição);
                                sem o link, o clique não cai em 403. */}
                            {n.ticket && n.canOpen !== false && (
                              <Link
                                href={`/ticket/${n.ticket.id}`}
                                onClick={() => { if (!n.readAt) markRead(n.id); setOpen(false); }}
                                className="inline-flex min-h-[32px] items-center text-xs font-bold text-emerald-600 hover:underline dark:text-emerald-400"
                              >
                                Abrir chamado →
                              </Link>
                            )}
                            {!n.readAt && (
                              <button
                                type="button"
                                data-cy="notification-mark-read"
                                onClick={() => markRead(n.id)}
                                className="inline-flex min-h-[32px] items-center gap-1 text-xs font-semibold text-slate-400 hover:text-emerald-500"
                              >
                                <LuCheck size={14} />
                                Marcar lida
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

