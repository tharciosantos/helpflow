'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { LuHeadphones } from 'react-icons/lu';
import { useTheme } from './ThemeProvider';
import ThemeToggle from './ThemeToggle';
import SidebarNav from './SidebarNav';
import UserProfile from './UserProfile';
import MobileHeader from './MobileHeader';

export default function DashboardShell({ children }) {
  const { theme } = useTheme();

  // App shell: enquanto o dashboard esta montado, o scroll pertence ao <main>,
  // nunca ao <body> nem ao <html>. Travar apenas o body nao bastava em alguns
  // navegadores: o viewport continuava com scroll proprio e apareciam duas
  // barras (uma do main e outra da janela), com a de fora passando do layout.
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = body.style.overflow;

    root.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    return () => {
      root.style.overflow = previousRootOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, []);

  return (
    <div id="hf-shell" className={`flex h-dvh overflow-hidden transition-colors duration-200 ${
      theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'
    }`}>
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex w-64 shrink-0 flex-col justify-between p-6 border-r transition-colors duration-200 ${
        theme === 'light' 
          ? 'bg-white border-slate-200 text-slate-900' 
          : 'bg-slate-900 border-slate-800 text-slate-100'
      }`}>
        <div>
          <div className="flex items-center justify-between mb-8">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs transition-transform duration-200 group-hover:scale-105">
                <LuHeadphones size={17} />
              </div>
              <span className={`text-xl font-bold tracking-tight ${
                theme === 'light' ? 'text-slate-900' : 'text-white'
              }`}>
                HelpFlow
              </span>
            </Link>
            <ThemeToggle />
          </div>
          <SidebarNav /> 
        </div>
        <div className={`border-t pt-4 ${
          theme === 'light' ? 'border-slate-200' : 'border-slate-800'
        }`}>
          <UserProfile />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <MobileHeader /> 
        <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
