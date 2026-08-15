
'use client';

import CreateTicketForm from "../../../../components/CreateTicketForm";
import { useRouter } from 'next/navigation';
import { useTheme } from "../../../../components/ThemeProvider";

export default function NewTicketPage() {
  const router = useRouter();
  const { theme } = useTheme();

  const handleTicketCreated = () => {
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div>
      <h1 className={`text-3xl font-bold mb-8 ${
        theme === 'light' ? 'text-slate-900' : 'text-white'
      }`}>Criar um Novo Ticket</h1>
      <CreateTicketForm onTicketCreated={handleTicketCreated} />
    </div>
  );
}