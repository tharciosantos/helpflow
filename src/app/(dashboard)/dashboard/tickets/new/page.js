
'use client';

import Link from "next/link";
import { useRouter } from 'next/navigation';
import { LuArrowLeft, LuTicketPlus } from 'react-icons/lu';
import CreateTicketForm from "../../../../components/CreateTicketForm";
import { useTheme } from "../../../../components/ThemeProvider";

export default function NewTicketPage() {
  const router = useRouter();
  const { theme } = useTheme();

  const handleTicketCreated = () => {
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Voltar ao Dashboard */}
      <div>
        <Link
          href="/dashboard"
          className={`inline-flex items-center gap-2 text-sm font-medium transition ${
            theme === 'light'
              ? 'text-slate-500 hover:text-teal-600'
              : 'text-slate-400 hover:text-teal-400'
          }`}
        >
          <LuArrowLeft size={16} />
          Voltar para o Dashboard
        </Link>
      </div>

      {/* Cabeçalho */}
      <div className="flex items-center gap-3.5">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
          theme === 'light'
            ? 'bg-teal-50 border-teal-200/80 text-teal-600'
            : 'bg-teal-950/40 border-teal-800/60 text-teal-400'
        }`}>
          <LuTicketPlus size={22} />
        </div>
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${
            theme === 'light' ? 'text-slate-900' : 'text-white'
          }`}>
            Abrir Novo Ticket
          </h1>
          <p className={`text-sm ${
            theme === 'light' ? 'text-slate-500' : 'text-slate-400'
          }`}>
            Descreva o chamado com clareza para agilizar o atendimento da equipe.
          </p>
        </div>
      </div>

      {/* Formulário */}
      <CreateTicketForm onTicketCreated={handleTicketCreated} />
    </div>
  );
}