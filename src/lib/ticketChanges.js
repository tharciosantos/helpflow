// ---------------------------------------------------------------------------
// Detecção de mudança real em um PATCH de chamado.
//
// Contexto: o PATCH sempre executava `ticket.update`, e `Ticket.updatedAt` é
// `@updatedAt` no Prisma. Como TODO update incrementa o timestamp, um PATCH
// com os mesmos valores (agente reescolhe o mesmo status, envia o formulário
// "Salvar Alterações Rápidas" sem mudar nada) fazia o update otimista de quem
// tinha a tela aberta acusar conflito (409) sem que ninguém tivesse alterado
// nada.
//
// A regra abaixo separa os campos de CONTEÚDO (que só justificam um update
// quando o valor realmente muda) dos campos DERIVADOS (`resolvedAt`,
// `firstResponseAt`), que só são gravados quando o servidor decidiu gravar —
// e por isso já são mudança real por si mesmos.
//
// Função pura: usada pela rota e coberta por testes unitários.
// ---------------------------------------------------------------------------

/** Campos do chamado cujo valor precisa mudar para justificar o update. */
export const CONTENT_FIELDS = ['title', 'description', 'status', 'priority', 'agentId', 'dueAt'];

/** Campos derivados: gravados pelo servidor, contam como mudança por si. */
const DERIVED_FIELDS = ['resolvedAt', 'firstResponseAt'];

/** Normaliza datas para ISO; null/undefined viram null. */
function normalizeValue(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

/**
 * Diz se o `data` preparado para o `ticket.update` altera algo de fato.
 *
 * - campo de conteúdo ausente (`undefined`) é ignorado;
 * - campo de conteúdo igual ao valor atual não conta como mudança;
 * - campo derivado presente (ex.: `resolvedAt` gravado ao fechar) conta.
 */
export function hasTicketChanges(ticket, data) {
  if (!ticket || !data) return false;

  for (const field of DERIVED_FIELDS) {
    if (data[field] !== undefined) return true;
  }

  for (const field of CONTENT_FIELDS) {
    if (data[field] === undefined) continue;
    if (normalizeValue(data[field]) !== normalizeValue(ticket[field])) return true;
  }

  return false;
}
