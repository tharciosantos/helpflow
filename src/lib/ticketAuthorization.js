const AGENT_ONLY_FIELDS = ['status', 'priority', 'agentId'];

export function canViewTicket(user, ticket) {
  return Boolean(user?.id && ticket && (user.role === 'AGENT' || ticket.authorId === user.id));
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
