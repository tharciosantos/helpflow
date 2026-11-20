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
// se atualizado for IGUAL a ele. O valor é opcional para não quebrar clientes
// antigos — quem não envia mantém o comportamento anterior.
//
// A comparação usa a TOLERÂNCIA como folga: o `where` aceita atualizado entre
// `expected - TOLERÂNCIA` e `expected + TOLERÂNCIA`. A ida e volta do ISO pode
// perder frações de segundo (a API serializa a Date para string), e um `where`
// de igualdade exata transformava essa folga em 409 falso para qualquer edição
// feita depois de 1 s. Escritas concorrentes reais ficam fora da janela e
// continuam sendo bloqueadas — uma escrita posterior tem `updatedAt` de pelo
// menos um segundo depois do esperado.
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
 * Faixa aceitável de `updatedAt` no banco para o valor esperado pelo cliente:
 * `[expected - TOLERÂNCIA, expected + TOLERÂNCIA]`. É o que entra no `where`.
 */
export function getUpdatedAtWindow(expectedUpdatedAt) {
  const expected = parseExpectedUpdatedAt(expectedUpdatedAt);
  if (!expected) return null;
  const time = expected.getTime();
  return {
    gte: new Date(time - CLOCK_TOLERANCE_MS),
    lte: new Date(time + CLOCK_TOLERANCE_MS),
  };
}

/**
 * Diz se o `expectedUpdatedAt` enviado pelo cliente ainda corresponde ao
 * estado atual do chamado.
 *
 * Sem valor esperado, a verificação é pulada (compatibilidade). A comparação
 * usa a mesma janela do `where`, para que a checagem em memória e a escrita
 * condicional discordem apenas em caso de corrida real.
 */
export function isUpdatedAtCurrent(expectedUpdatedAt, currentUpdatedAt) {
  const window = getUpdatedAtWindow(expectedUpdatedAt);
  if (!window) return true;

  const current = parseExpectedUpdatedAt(currentUpdatedAt);
  if (!current) return false;

  const time = current.getTime();
  return time >= window.gte.getTime() && time <= window.lte.getTime();
}

/**
 * Monta o `where` do update. Com `expectedUpdatedAt` válido, a escrita fica
 * condicionada à janela de `updatedAt` — o Prisma levanta P2025 quando nada
 * casa.
 */
export function buildOptimisticWhere(id, expectedUpdatedAt) {
  const window = getUpdatedAtWindow(expectedUpdatedAt);
  if (!window) return { id };
  return { id, updatedAt: { gte: window.gte, lte: window.lte } };
}

/** A mensagem de 409 entregue ao cliente quando a escrita perde a corrida. */
export const CONFLICT_MESSAGE =
  'Este chamado foi alterado por outra pessoa enquanto você editava. Recarregue para ver a versão atual.';
