// ---------------------------------------------------------------------------
// Regras de notificacao in-app (sino) do HelpFlow.
//
// Funcao PURA: recebe o evento e o ticket, devolve a lista de destinatarios.
// Nao toca em banco nem HTTP - por isso e trivial de testar (ver notifications.test.js).
//
// Regras de dominio:
//   - COMMENT  -> notifica o "outro lado": se um AGENT comentou, notifica o autor
//                 (cliente); se o autor (cliente) comentou, notifica o agente responsavel.
//   - ASSIGNED -> notifica o novo responsavel atribuido.
//   - STATUS   -> notifica o autor (cliente acompanha a mudanca de estado).
// Regra de ouro: NUNCA notificar quem praticou a acao (actor).
// Nota interna (visibility INTERNAL) nao gera notificacao - e alinhamento da TI.
// ---------------------------------------------------------------------------

// Remove duplicados, valores nulos e o proprio autor da acao.
function uniqueRecipients(ids, actorId) {
  const set = new Set();
  for (const id of ids) {
    if (!id) continue;
    if (id === actorId) continue; // nao notifica quem fez a acao
    set.add(id);
  }
  return [...set];
}

/**
 * Resolve os destinatarios de uma notificacao.
 * @param {Object} input
 * @param {'COMMENT'|'ASSIGNED'|'STATUS'} input.event
 * @param {{id: string, role?: string}} input.actor           - quem praticou a acao
 * @param {{authorId: string, agentId?: string|null}} input.ticket
 * @param {string} [input.newAgentId]                          - novo responsavel (para ASSIGNED)
 * @returns {string[]} ids de usuarios que devem receber a notificacao
 */
export function resolveNotificationRecipients({ event, actor, ticket, newAgentId }) {
  switch (event) {
    case 'COMMENT': {
      // Se comentou um agente -> notifica o autor. Se comentou o autor -> notifica o agente.
      if (actor.role === 'AGENT') {
        return uniqueRecipients([ticket.authorId], actor.id);
      }
      return uniqueRecipients([ticket.agentId], actor.id);
    }
    case 'ASSIGNED':
      return uniqueRecipients([newAgentId], actor.id);
    case 'STATUS':
      // O autor acompanha a mudanca de status (se nao foi ele quem mudou).
      return uniqueRecipients([ticket.authorId], actor.id);
    default:
      return [];
  }
}

// Mensagens curtas e humanas por tipo de evento.
export function buildNotificationMessage({ event, actorName, ticketTitle }) {
  const who = actorName || 'Alguem';
  const title = ticketTitle ? ` "${ticketTitle}"` : '';
  switch (event) {
    case 'COMMENT':
      return `${who} comentou no chamado${title}.`;
    case 'ASSIGNED':
      return `${who} atribuiu um chamado para voce${title}.`;
    case 'STATUS':
      return `O chamado${title} teve o status atualizado por ${who}.`;
    default:
      return `${who} atualizou o chamado${title}.`;
  }
}
