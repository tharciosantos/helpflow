// Auditoria de chamados: registra quem mudou o quê, quando.
// Usado em PATCH /api/tickets/[id] dentro da mesma transação do update.

const AUDITABLE_FIELDS = ['status', 'priority', 'agentId', 'title', 'description', 'dueAt'];

function normalizeValue(value) {
  if (value === null || value === undefined) return null;
  return String(value);
}

/**
 * Compara ticket antigo vs novos dados e retorna entradas de histórico.
 * Ignora campos iguais, inexistentes ou não auditáveis.
 */
export function buildHistoryEntries({ ticket, data, actorId }) {
  if (!ticket || !data || !actorId) return [];

  const entries = [];

  for (const field of AUDITABLE_FIELDS) {
    if (data[field] === undefined) continue;

    const from = normalizeValue(ticket[field]);
    const to = normalizeValue(data[field]);

    if (from === to) continue;

    entries.push({
      ticketId: ticket.id,
      actorId,
      field,
      from,
      to,
    });
  }

  return entries;
}

export function canViewHistory(user, ticket) {
  // Mesma regra de visibilidade do ticket: sem acesso ao ticket, sem histórico.
  if (!user?.id || !ticket) return false;
  if (user.companyId && ticket.companyId && user.companyId !== ticket.companyId) {
    return false;
  }
  if (user.role === 'AGENT') return true;
  return ticket.authorId === user.id || ticket.agentId === user.id;
}
