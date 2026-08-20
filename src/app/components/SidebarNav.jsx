'use client'; 

import Link from 'next/link';
import { LuLayoutDashboard, LuTicketPlus } from 'react-icons/lu';
import { usePathname } from 'next/navigation'; 
import { useTheme } from './ThemeProvider';

export default function SidebarNav({ dataCyPrefix = 'sidebar' }) {
  const pathname = usePathname();
  const { theme } = useTheme();

  const getLinkClasses = (path) => {
    const isActive = pathname === path;
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
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${getLinkClasses('/dashboard')}`}
      >
        <LuLayoutDashboard size={20} />
        <span>Dashboard</span>
      </Link>
      <Link 
        data-cy={`${dataCyPrefix}-new-ticket-link`}
        href="/dashboard/tickets/new" 
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${getLinkClasses('/dashboard/tickets/new')}`}
      >
        <LuTicketPlus size={20} />
        <span>Novo Ticket</span>
      </Link>
    </nav>
  );
}
