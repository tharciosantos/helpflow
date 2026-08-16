'use client';

import Link from 'next/link';
import { LuHeadphones } from 'react-icons/lu';
import { useTheme } from './ThemeProvider';
import ThemeToggle from './ThemeToggle';
import SidebarNav from './SidebarNav';
import UserProfile from './UserProfile';
import MobileHeader from './MobileHeader';

export default function DashboardShell({ children }) {
  const { theme } = useTheme();

  return (
    <div className={`flex h-screen transition-colors duration-200 ${
      theme === 'light' ? 'bg-slate-100 text-slate-900' : 'bg-slate-900 text-white'
    }`}>
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex w-64 p-6 flex-col justify-between border-r transition-colors duration-200 ${
        theme === 'light' 
          ? 'bg-white border-slate-200 text-slate-900' 
          : 'bg-slate-800 border-slate-700/60 text-white'
      }`}>
        <div>
          <div className="flex items-center justify-between mb-8">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white shadow-xs transition-transform duration-200 group-hover:scale-105">
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
          theme === 'light' ? 'border-slate-200' : 'border-slate-700'
        }`}>
          <UserProfile />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileHeader /> 
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
