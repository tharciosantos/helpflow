const AGENT_ONLY_FIELDS = ['status', 'priority', 'agentId'];

export function canViewTicket(user, ticket) {
  if (!user?.id || !ticket) return false;

  // Se ambos possuem companyId e são diferentes, bloqueia imediatamente
  if (user.companyId && ticket.companyId && user.companyId !== ticket.companyId) {
    return false;
  }

  // Agente da mesma empresa (ou sem empresa atribuída) pode ver
  if (user.role === 'AGENT') return true;

  // Funcionário pode ver o seu próprio ticket ou o ticket onde foi atribuído como responsável
  return ticket.authorId === user.id || ticket.agentId === user.id;
}

export function canDeleteTicket(user, ticket) {
  return canViewTicket(user, ticket);
}

export function getForbiddenTicketFields(user, body = {}) {
  if (user?.role === 'AGENT') return [];
  return AGENT_ONLY_FIELDS.filter((field) => body[field] !== undefined);
}

export function canEditTicketContent(user, ticket) {
  return canViewTicket(user, ticket);
}
