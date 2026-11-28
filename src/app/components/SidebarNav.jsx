'use client'; 

import Link from 'next/link';
import { LuLayoutDashboard, LuTicketPlus } from 'react-icons/lu';
import { usePathname } from 'next/navigation'; 
import { useTheme } from './ThemeProvider';
import NotificationBell from './NotificationBell';
import { getActiveNavHref } from '@/lib/navActive';

export default function SidebarNav({ dataCyPrefix = 'sidebar', showNotifications = true }) {
  const pathname = usePathname();
  const { theme } = useTheme();
  // Item 11: rotas de chamado não são itens da sidebar e deixavam tudo apagado.
  const activeHref = getActiveNavHref(pathname);

  const getLinkClasses = (path) => {
    const isActive = activeHref === path;
    if (theme === 'light') {
      return isActive 
        ? 'bg-emerald-50 text-emerald-700 font-semibold shadow-xs border border-emerald-200/90' 
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900';
    } else {
      return isActive 
        ? 'bg-emerald-950/50 text-emerald-300 font-semibold shadow-xs border border-emerald-800/40' 
        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200';
    }
  };

  return (
    <nav className="space-y-2">
      <Link 
        data-cy={`${dataCyPrefix}-dashboard-link`}
        href="/dashboard"
        aria-current={activeHref === '/dashboard' ? 'page' : undefined}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${getLinkClasses('/dashboard')}`}
      >
        <LuLayoutDashboard size={20} />
        <span>Dashboard</span>
      </Link>
      <Link 
        data-cy={`${dataCyPrefix}-new-ticket-link`}
        href="/dashboard/tickets/new"
        aria-current={activeHref === '/dashboard/tickets/new' ? 'page' : undefined}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${getLinkClasses('/dashboard/tickets/new')}`}
      >
        <LuTicketPlus size={20} />
        <span>Novo Chamado</span>
      </Link>
      {showNotifications && <NotificationBell />}
    </nav>
  );
}
