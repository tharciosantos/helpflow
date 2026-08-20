'use client';

import { useSession, signOut } from 'next-auth/react';
import { LuLogOut, LuBuilding2 } from 'react-icons/lu';
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
            theme === 'light' ? 'border-slate-200' : 'border-slate-700'
          }`}
        />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium truncate ${
            theme === 'light' ? 'text-slate-900' : 'text-slate-100'
          }`}>{session.user.name}</p>
          <p className={`text-xs truncate ${
            theme === 'light' ? 'text-slate-500' : 'text-slate-400'
          }`}>{session.user.email}</p>
          {session.user.companyName && (
            <p className={`text-[11px] font-medium truncate mt-0.5 flex items-center gap-1 ${
              theme === 'light' ? 'text-emerald-700' : 'text-emerald-400'
            }`}>
              <LuBuilding2 size={13} className="shrink-0" />
              <span className="truncate">{session.user.companyName}</span>
            </p>
          )}
          <div className="mt-1.5 flex items-center">
            {session.user.role === 'AGENT' ? (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium border ${
                theme === 'light'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                  : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
              }`}>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                Empresa / Suporte
              </span>
            ) : (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium border ${
                theme === 'light'
                  ? 'bg-blue-50 text-blue-700 border-blue-200/80'
                  : 'bg-blue-950/40 text-blue-300 border-blue-800/40'
              }`}>
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" aria-hidden="true" />
                Funcionário
              </span>
            )}
          </div>
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
