'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { HiMenu, HiX } from 'react-icons/hi';
import SidebarNav from './SidebarNav';
import NotificationBell from './NotificationBell';
import UserProfile from './UserProfile';
import ThemeToggle from './ThemeToggle';
import { useTheme } from './ThemeProvider';
import { usePathname } from 'next/navigation';

export default function MobileHeader() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { theme } = useTheme();
  const pathname = usePathname();

  // Fecha o drawer ao navegar e trava o scroll do body enquanto aberto
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isSidebarOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setIsSidebarOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [isSidebarOpen]);

  return (
    <>
      <header className={`md:hidden sticky top-0 z-40 px-4 py-3 flex justify-between items-center gap-2 border-b transition-colors [padding-top:max(0.75rem,env(safe-area-inset-top))] ${
        theme === 'light'
          ? 'bg-white border-slate-200 text-slate-900'
          : 'bg-slate-900 border-slate-800 text-white'
      }`}>
        <Link href="/dashboard" data-cy="mobile-header-dashboard-link" className={`min-w-0 truncate text-lg font-bold tracking-tight ${
          theme === 'light' ? 'text-slate-900' : 'text-white'
        }`}>
          HelpFlow
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
          <ThemeToggle />
          <NotificationBell variant="icon" />
          <button 
            data-cy="mobile-menu-open"
            onClick={() => setIsSidebarOpen(true)}
            className={`${theme === 'light' ? 'text-slate-700 hover:text-slate-900' : 'text-slate-300 hover:text-white'} rounded-lg p-2 -m-1 min-h-[44px] min-w-[44px] inline-flex items-center justify-center`}
            aria-label="Abrir menu"
            aria-expanded={isSidebarOpen}
          >
            <HiMenu size={24} />
          </button>
        </div>
      </header>

      {isSidebarOpen && (
        <>
          <div 
            data-cy="mobile-menu-overlay"
            className="fixed inset-0 bg-black/60 z-40 md:hidden" 
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navegação"
            className={`fixed top-0 left-0 h-dvh w-[85vw] max-w-xs px-5 pt-5 pb-5 flex flex-col min-h-0 z-50 transform transition-transform duration-300 ease-in-out md:hidden border-r [padding-bottom:max(1.25rem,env(safe-area-inset-bottom))] ${
            theme === 'light'
              ? 'bg-white text-slate-900 border-slate-200'
              : 'bg-slate-900 text-white border-slate-800'
          }`}
            style={{ transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)' }}
          >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="flex justify-between items-center mb-6">
                <h1 className={`text-2xl font-bold tracking-tight ${
                  theme === 'light' ? 'text-slate-900' : 'text-white'
                }`}>HelpFlow</h1>
                <button 
                  data-cy="mobile-menu-close"
                  onClick={() => setIsSidebarOpen(false)}
                  className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg -m-1 p-2 ${theme === 'light' ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}
                  aria-label="Fechar menu"
                >
                  <HiX size={24} />
                </button>
              </div>
              <div onClick={() => setIsSidebarOpen(false)}> 
                 <SidebarNav dataCyPrefix="mobile-sidebar" showNotifications={false} />
              </div>
            </div>
            <div className={`shrink-0 border-t pt-4 ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
              <UserProfile />
            </div>
          </aside>
        </>
      )}
    </>
  );
}
