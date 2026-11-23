// ---------------------------------------------------------------------------
// Acessibilidade atual das notificacoes do sino.
//
// Funcao PURA: decidido a partir da sessao, da lista bruta do GET e do estado
// atual dos chamados (id -> { authorId, agentId, companyId }).
//
// Motivo: atribuir e permitido a qualquer membro da empresa, inclusive CLIENT
// (delegacao). Quando o AGENT reatribui ou remove o responsavel, a notificacao
// ASSIGNED antiga continua no sino do responsavel anterior e o link "Abrir
// chamado" levaria a um 403 em /ticket/[id]. A mesma funcao de autorizacao da
// aplicacao (canViewTicket) decide se a linha ainda pode ser aberta.
// ---------------------------------------------------------------------------

import { canViewTicket } from './ticketAuthorization';

/**
 * Anexa `canOpen` a cada notificacao e separa as que nao podem mais ser abertas.
 * Notificacoes sem chamado (ou com chamado ja excluido) nunca sao abertas.
 *
 * @param {{id: string, role?: string, companyId?: string|null}} user
 * @param {Array<{id: string, ticketId?: string|null, ticket?: {id: string}|null}>} notifications
 * @param {Map<string, {id: string, authorId: string, agentId?: string|null, companyId?: string|null}>} ticketsById
 * @returns {{visible: Array<object>, hidden: Array<object>}}
 */
export function partitionNotificationsByAccess(
  user,
  notifications = [],
  ticketsById = new Map(),
  { canView = canViewTicket } = {}
) {
  const visible = [];
  const hidden = [];

  for (const notification of notifications) {
    const ticketRef = notification.ticket || null;
    const ticketId = ticketRef?.id || notification.ticketId || null;
    const ticket = ticketId ? ticketsById.get(ticketId) : null;
    const entry = { ...notification, canOpen: Boolean(ticket && canView(user, ticket)) };

    if (entry.canOpen) {
      visible.push(entry);
    } else {
      hidden.push(entry);
    }
  }

  return { visible, hidden };
}

/**
 * Contador do sino restrito ao que a resposta exibe: notificações inacessíveis
 * não podem manter o badge aceso para um item que o painel nunca mostra.
 *
 * @param {Array<{readAt?: string|Date|null}>} notifications
 * @returns {number}
 */
export function remainingUnreadCount(notifications = []) {
  return notifications.reduce((total, notification) => total + (notification.readAt ? 0 : 1), 0);
}
