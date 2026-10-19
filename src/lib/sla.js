// ---------------------------------------------------------------------------
// Regras de SLA do HelpFlow.
//
// Conceito: o prazo (dueAt) é DERIVADO da prioridade na criação. O AGENT pode
// sobrescrevê-lo manualmente no formulário de edição ou pedir o recálculo ao
// trocar a prioridade (recalcDue). As funções abaixo continuam puras/testáveis.
//
// SLA_HOURS define, em horas, o tempo alvo para cada prioridade:
//   LOW 7d · MEDIUM 3d · HIGH 24h · URGENT 4h
// ---------------------------------------------------------------------------

export const SLA_HOURS = {
  LOW: 168, // 7 dias
  MEDIUM: 72, // 3 dias
  HIGH: 24, // 1 dia
  URGENT: 4, // 4 horas
};

const HOUR_MS = 60 * 60 * 1000;

// Fallback defensivo: prioridade desconhecida trata como MEDIUM.
export function getSlaHours(priority) {
  return SLA_HOURS[priority] ?? SLA_HOURS.MEDIUM;
}

// Calcula o prazo absoluto (Date) somando as horas do SLA à data base.
// `createdAt` aceita Date ou string ISO; por padrão usa "agora".
export function computeDueAt(priority, createdAt = new Date()) {
  const base = createdAt instanceof Date ? createdAt : new Date(createdAt);
  return new Date(base.getTime() + getSlaHours(priority) * HOUR_MS);
}

// Interpreta o `dueAt` vindo da API. Exigimos offset explícito (Z ou ±HH:MM)
// porque `new Date('2026-10-20T14:30')` usa o fuso DO SERVIDOR: em produção
// (UTC) um horário digitado no Brasil seria deslocado 3h para trás.
const EXPLICIT_TIME_ZONE = /(?:[zZ]|[+-]\d{2}:?\d{2})$/;

export function parseDueAtInput(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || !EXPLICIT_TIME_ZONE.test(trimmed)) return null;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// Define a intenção do PATCH em relação ao prazo, sem tocar em banco/HTTP.
// Precedência: limpar manualmente > prazo manual > recálculo por prioridade.
export function resolveDueAtUpdate({
  bodyDueAt,
  recalcDue,
  priority,
  ticketPriority,
} = {}) {
  if (bodyDueAt === null) return 'clear';
  if (bodyDueAt !== undefined && bodyDueAt !== '') return 'manual';
  if (
    recalcDue === true
    && priority !== undefined
    && priority !== ticketPriority
  ) {
    return 'recalc';
  }
  return 'keep';
}

// Diferença em DIAS DE CALENDÁRIO (não em blocos de 24h). É o que o resumo
// do formulário precisa: hoje às 14:30 é "hoje", mesmo que daqui a 2h;
// amanhã às 09:00 é "amanhã", mesmo que daqui a 20h.
export function calendarDayDiff(from, to) {
  if (!(from instanceof Date) || !(to instanceof Date)) return null;
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  // Normaliza para meia-noite no calendário local e compara em UTC, evitando
  // oscilações de 23/25h em fusos com horário de verão.
  const startOfLocalDayUtc = (date) => Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  return Math.round(
    (startOfLocalDayUtc(to) - startOfLocalDayUtc(from)) / (24 * HOUR_MS)
  );
}

// Um ticket está "atrasado" quando tem prazo, ainda não foi fechado e o
// prazo já passou. Cálculo on-read: não gravamos status de atraso, apenas
// comparamos dueAt com o agora no momento da leitura.
export function isOverdue(ticket, now = new Date()) {
  if (!ticket?.dueAt) return false;
  if (ticket.status === 'CLOSED') return false;
  return new Date(ticket.dueAt).getTime() < new Date(now).getTime();
}
