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
  if (!canViewTicket(user, ticket)) return false;
  // P0: CLIENT só exclui o próprio ticket ainda em OPEN.
  // AGENT pode excluir qualquer ticket da empresa (soft-delete na API).
  if (user?.role === 'AGENT') return true;
  return ticket.authorId === user?.id && ticket.status === 'OPEN';
}

export function getForbiddenTicketFields(user, body = {}) {
  if (user?.role === 'AGENT') return [];
  return AGENT_ONLY_FIELDS.filter((field) => body[field] !== undefined);
}

export function canEditTicketContent(user, ticket) {
  if (!canViewTicket(user, ticket)) return false;
  // P0: regra documentada — CLIENT só edita conteúdo do próprio ticket em OPEN.
  // AGENT mantém poder de triagem em qualquer status.
  if (user?.role === 'AGENT') return true;
  return ticket.authorId === user?.id && ticket.status === 'OPEN';
}

export function canCommentOnTicket(user, ticket) {
  return canViewTicket(user, ticket);
}

export function canDeleteComment(user, comment, ticket) {
  if (!user?.id || !comment || !ticket) return false;
  if (!canViewTicket(user, ticket)) return false;
  if (comment.authorId === user.id) return true;
  if (user.role === 'AGENT') return true;
  return false;
}

