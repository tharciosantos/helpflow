'use client';

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
            <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
              HelpFlow
            </h1>
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
