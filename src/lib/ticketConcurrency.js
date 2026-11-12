// ---------------------------------------------------------------------------
// Controle de concorrência otimista do chamado (PATCH).
//
// O PATCH lia o chamado, validava e gravava sem conferir se alguém alterou o
// registro no meio do caminho. Dois agentes editando o mesmo chamado: o último
// a gravar sobrescrevia o primeiro em silêncio, e o histórico registrava eventos
// que não correspondiam ao estado real.
//
// A solução é um update otimista sobre `Ticket.updatedAt`: o cliente envia o
// `updatedAt` que carregou (`expectedUpdatedAt`) e o banco só aplica a mudança
// se ele ainda for o atual. O valor é opcional para não quebrar clientes
// antigos — quem não envia mantém o comportamento anterior.
// ---------------------------------------------------------------------------

/** Tempo máximo aceitável entre relógios (ms) ao comparar `updatedAt`. */
const CLOCK_TOLERANCE_MS = 1000;

/**
 * Normaliza um `updatedAt` vindo do cliente ou do banco para Date.
 * Retorna null quando o valor é inválido ou ausente.
 */
export function parseExpectedUpdatedAt(value) {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Diz se o `expectedUpdatedAt` enviado pelo cliente ainda corresponde ao
 * estado atual do chamado.
 *
 * Sem valor esperado, a verificação é pulada (compatibilidade). A comparação
 * tolera pequenas diferenças de relógio, porque o timestamp trafega como
 * string ISO e pode perder precisão na ida e volta.
 */
export function isUpdatedAtCurrent(expectedUpdatedAt, currentUpdatedAt) {
  const expected = parseExpectedUpdatedAt(expectedUpdatedAt);
  if (!expected) return true;

  const current = parseExpectedUpdatedAt(currentUpdatedAt);
  if (!current) return false;

  return Math.abs(current.getTime() - expected.getTime()) <= CLOCK_TOLERANCE_MS;
}

/**
 * Monta o `where` do update. Com `expectedUpdatedAt` válido, a escrita fica
 * condicionada ao valor atual — o Prisma levanta P2025 quando nada casa.
 */
export function buildOptimisticWhere(id, expectedUpdatedAt) {
  const expected = parseExpectedUpdatedAt(expectedUpdatedAt);
  if (!expected) return { id };
  return { id, updatedAt: expected };
}

/** A mensagem de 409 entregue ao cliente quando a escrita perde a corrida. */
export const CONFLICT_MESSAGE =
  'Este chamado foi alterado por outra pessoa enquanto você editava. Recarregue para ver a versão atual.';
