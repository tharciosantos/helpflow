'use client';

import { useSession, signOut } from 'next-auth/react';
import { LuLogOut } from 'react-icons/lu';
import { useTheme } from './ThemeProvider';

export default function UserProfile() {
  const { data: session } = useSession();
  const { theme } = useTheme();

  if (!session) return null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <img
          src={session.user.image || '/default-avatar.png'}
          alt={session.user.name}
          className={`w-10 h-10 rounded-full border-2 ${
            theme === 'light' ? 'border-slate-300' : 'border-gray-600'
          }`}
        />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium truncate ${
            theme === 'light' ? 'text-slate-900' : 'text-white'
          }`}>{session.user.name}</p>
          <p className={`text-xs truncate ${
            theme === 'light' ? 'text-slate-500' : 'text-gray-400'
          }`}>{session.user.email}</p>
        </div>
      </div>
      <button
        data-cy="user-logout"
        onClick={() => signOut({ callbackUrl: '/' })}
        className={`w-full flex items-center justify-center gap-2 p-2 rounded-lg text-sm text-red-500 transition-colors ${
          theme === 'light' ? 'hover:bg-red-50' : 'hover:bg-red-950/50'
        }`}
      >
        <LuLogOut />
        <span>Sair da Conta</span>
      </button>
    </div>
  );
}
