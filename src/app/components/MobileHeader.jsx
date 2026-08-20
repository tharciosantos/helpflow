'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HiMenu, HiX } from 'react-icons/hi';
import SidebarNav from './SidebarNav';
import UserProfile from './UserProfile';
import ThemeToggle from './ThemeToggle';
import { useTheme } from './ThemeProvider';

export default function MobileHeader() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { theme } = useTheme();

  return (
    <>
      <header className={`md:hidden sticky top-0 z-40 p-4 flex justify-between items-center border-b transition-colors ${
        theme === 'light'
          ? 'bg-white border-slate-200 text-slate-900'
          : 'bg-slate-900 border-slate-800 text-white'
      }`}>
        <Link href="/dashboard" data-cy="mobile-header-dashboard-link" className={`text-xl font-bold tracking-tight ${
          theme === 'light' ? 'text-slate-900' : 'text-white'
        }`}>
          HelpFlow
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button 
            data-cy="mobile-menu-open"
            onClick={() => setIsSidebarOpen(true)}
            className={theme === 'light' ? 'text-slate-700 hover:text-slate-900' : 'text-slate-300 hover:text-white'}
            aria-label="Abrir menu"
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

          <aside className={`fixed top-0 left-0 h-full w-64 p-6 flex flex-col justify-between z-50 transform transition-transform duration-300 ease-in-out md:hidden border-r ${
            theme === 'light'
              ? 'bg-white text-slate-900 border-slate-200'
              : 'bg-slate-900 text-white border-slate-800'
          }`}
            style={{ transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)' }}
          >
            <div>
              <div className="flex justify-between items-center mb-8">
                <h1 className={`text-2xl font-bold tracking-tight ${
                  theme === 'light' ? 'text-slate-900' : 'text-white'
                }`}>HelpFlow</h1>
                <button 
                  data-cy="mobile-menu-close"
                  onClick={() => setIsSidebarOpen(false)}
                  className={theme === 'light' ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'}
                  aria-label="Fechar menu"
                >
                  <HiX size={24} />
                </button>
              </div>
              <div onClick={() => setIsSidebarOpen(false)}> 
                 <SidebarNav dataCyPrefix="mobile-sidebar" />
              </div>
            </div>
            <div className={`border-t pt-4 ${theme === 'light' ? 'border-slate-200' : 'border-slate-800'}`}>
              <UserProfile />
            </div>
          </aside>
        </>
      )}
    </>
  );
}
