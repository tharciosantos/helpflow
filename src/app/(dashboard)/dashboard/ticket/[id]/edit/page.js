'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LuArrowLeft, LuPencil } from 'react-icons/lu';
import EditTicketForm from '../../../../../components/EditTicketForm';
import { useSession } from 'next-auth/react';
import { useTheme } from '../../../../../components/ThemeProvider';

export default function EditTicketPage() {
    const { id } = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const { theme } = useTheme();
    const [ticket, setTicket] = useState(null);
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (id) {
            const fetchTicket = async () => {
                try {
                    setLoading(true);
                    const res = await fetch(`/api/tickets/${id}`);
                    if (!res.ok) {
                        throw new Error('Falha ao buscar o ticket.');
                    }
                    const data = await res.json();
                    setTicket(data);
                } catch (err) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            };
            fetchTicket();
        }
    }, [id]);

    useEffect(() => {
        if (session?.user?.role === 'AGENT') {
            const fetchAgents = async () => {
                try {
                    const res = await fetch('/api/agents');
                    if (res.ok) {
                        setAgents(await res.json());
                    }
                } catch (err) {
                    console.error('Erro ao buscar membros:', err);
                }
            };
            fetchAgents();
        }
    }, [session?.user?.role]);

    const handleTicketUpdated = () => {
        router.push('/dashboard');
    };

    if (loading) {
        return <p className={`text-center mt-12 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Carregando ticket...</p>;
    }

    if (error) {
        return <p className={`text-center mt-12 ${theme === 'light' ? 'text-red-600' : 'text-red-400'}`}>{error}</p>;
    }

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
                    <LuPencil size={20} />
                </div>
                <div>
                    <h1 className={`text-2xl font-bold tracking-tight ${
                        theme === 'light' ? 'text-slate-900' : 'text-white'
                    }`}>
                        Editar Ticket
                    </h1>
                    <p className={`text-sm ${
                        theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                        Atualize os detalhes do chamado #{id?.slice(-6)}.
                    </p>
                </div>
            </div>

            {/* Formulário */}
            {ticket && (
                <div className={`rounded-2xl border p-6 sm:p-8 shadow-xs transition-colors ${
                    theme === 'light'
                        ? 'bg-white border-slate-200/90'
                        : 'bg-slate-900/80 border-slate-800'
                }`}>
                    <EditTicketForm
                        ticket={ticket}
                        onTicketUpdated={handleTicketUpdated}
                        isAgent={session?.user?.role === 'AGENT'}
                        agents={agents}
                    />
                </div>
            )}
        </div>
    );
}
