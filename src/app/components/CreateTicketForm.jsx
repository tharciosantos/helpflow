'use client';

import { useState } from 'react';

export default function CreateTicketForm({ onTicketCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage('Enviando...');

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });

      if (res.ok) {
        setStatusMessage('Ticket criado com sucesso!');
        setTitle('');
        setDescription('');
        if (onTicketCreated) {
          onTicketCreated();
        }
      } else {
        const error = await res.json();
        setStatusMessage(`Erro: ${error.message || 'Não foi possível criar o ticket.'}`);
      }
    } catch (err) {
      // Erro de rede, timeout, servidor offline, etc.
      setStatusMessage('Erro de conexão. Verifique sua internet e tente novamente.');
      console.error('Erro ao criar ticket:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-gray-800 rounded-lg shadow-md max-w-md mx-auto mt-10">
      <h2 className="text-2xl font-bold mb-6 text-white text-center">Abrir Novo Ticket</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-300">Título</label>
          <input
            data-cy="ticket-create-title"
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-300">Descrição do Problema</label>
          <textarea
            data-cy="ticket-create-description"
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-teal-500 focus:border-indigo-500 sm:text-sm"
          ></textarea>
        </div>
      </div>
      <div className="mt-6 text-center">
        <button
          data-cy="ticket-create-submit"
          type="submit"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors"
        >
          Criar Ticket
        </button>
      </div>
      {statusMessage && <p className="mt-4 text-center text-sm text-gray-400">{statusMessage}</p>}
    </form>
  );
}
