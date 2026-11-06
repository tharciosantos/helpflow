const AGENT_ONLY_FIELDS = ['status', 'priority', 'agentId', 'dueAt', 'recalcDue'];

export function canViewTicket(user, ticket) {
  if (!user?.id || !ticket) return false;

  // Isolamento multi-empresa fail-closed:
  // - empresa diferente -> bloqueia;
  // - usuário da empresa A x ticket sem empresa (ou vice-versa) -> bloqueia;
  // - ambos sem empresa (contas legadas/standalone) -> apenas autor/responsável.
  const sameCompany = Boolean(
    user.companyId && ticket.companyId && user.companyId === ticket.companyId
  );
  const legacyPersonalScope = !user.companyId && !ticket.companyId;

  if (!sameCompany && !legacyPersonalScope) return false;

  // Agente só tem visão ampla dentro da própria empresa.
  if (user.role === 'AGENT' && sameCompany) return true;

  // Funcionário vê o próprio ticket ou onde foi atribuído como responsável.
  return ticket.authorId === user.id || ticket.agentId === user.id;
}

export function canDeleteTicket(user, ticket) {
  if (!canViewTicket(user, ticket)) return false;
  // P0: CLIENT só exclui o próprio ticket ainda em OPEN.
  // AGENT pode excluir qualquer ticket da empresa (hard delete na API).
  if (user?.role === 'AGENT') return true;
  return ticket.authorId === user?.id && ticket.status === 'OPEN';
}

export function getForbiddenTicketFields(user, body = {}) {
  if (user?.role === 'AGENT') return [];
  const payload = body ?? {};
  return AGENT_ONLY_FIELDS.filter((field) => payload[field] !== undefined);
}

export function canEditTicketContent(user, ticket) {
  if (!canViewTicket(user, ticket)) return false;
  // P0: regra documentada — CLIENT só edita conteúdo do próprio ticket em OPEN.
  // AGENT mantém poder de triagem em qualquer status.
  if (user?.role === 'AGENT') return true;
  return ticket.authorId === user?.id && ticket.status === 'OPEN';
}

export function canCommentOnTicket(user, ticket) {
  if (!canViewTicket(user, ticket)) return false;
  // Chamado fechado é encerrado para o CLIENT: follow-up deve virar novo
  // chamado. O AGENT mantém o direito de comentar (ex.: nota de encerramento).
  if (user?.role === 'AGENT') return true;
  return ticket.status !== 'CLOSED';
}

// Explica a recusa de edição sem revelar dados de chamados de terceiros:
// o autor legítimo entende que o chamado saiu de OPEN; os demais recebem
// a mensagem genérica.
export function getEditDenialMessage(user, ticket) {
  if (user?.role === 'AGENT') return 'Não autorizado';
  if (ticket?.authorId === user?.id) {
    return 'Chamados em atendimento ou fechados só podem ser editados pela equipe de suporte.';
  }
  return 'Não autorizado';
}

export function canDeleteComment(user, comment, ticket) {
  if (!user?.id || !comment || !ticket) return false;
  if (!canViewTicket(user, ticket)) return false;
  if (user.role === 'AGENT') return true;
  // Paridade com canCommentOnTicket: se o CLIENT não pode criar comentário em
  // chamado fechado, também não pode remover o que já existe.
  if (ticket.status === 'CLOSED') return false;
  return comment.authorId === user.id;
}

