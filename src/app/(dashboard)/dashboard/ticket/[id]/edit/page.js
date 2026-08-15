'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import EditTicketForm from '../../../../../components/EditTicketForm';
import { useSession } from 'next-auth/react';
import { useTheme } from '../../../../../components/ThemeProvider';

export default function EditTicketPage() {
    const { id } = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const { theme } = useTheme();
    const [ticket, setTicket] = useState(null);
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

    const handleTicketUpdated = () => {
        router.push('/dashboard');
    };

    if (loading) {
        return <p className={`text-center mt-12 ${theme === 'light' ? 'text-slate-500' : 'text-gray-400'}`}>Carregando ticket...</p>;
    }

    if (error) {
        return <p className={`text-center mt-12 ${theme === 'light' ? 'text-red-600' : 'text-red-500'}`}>{error}</p>;
    }

    return (
        <div>
            <h1 className={`text-3xl font-bold mb-6 ${
                theme === 'light' ? 'text-slate-900' : 'text-white'
            }`}>Editar Ticket</h1>
            {ticket && <EditTicketForm ticket={ticket} onTicketUpdated={handleTicketUpdated} isAgent={session?.user?.role === 'AGENT'} />}
        </div>
    );
}
