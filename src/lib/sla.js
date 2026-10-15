// ---------------------------------------------------------------------------
// Regras de SLA do HelpFlow.
//
// Conceito: o prazo (dueAt) NÃO é digitado pelo agente. Ele é DERIVADO da
// prioridade no momento da criação, o que garante consistência e permite
// testar a regra isoladamente (função pura, sem banco nem HTTP).
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

// Um ticket está "atrasado" quando tem prazo, ainda não foi fechado e o
// prazo já passou. Cálculo on-read: não gravamos status de atraso, apenas
// comparamos dueAt com o agora no momento da leitura.
export function isOverdue(ticket, now = new Date()) {
  if (!ticket?.dueAt) return false;
  if (ticket.status === 'CLOSED') return false;
  return new Date(ticket.dueAt).getTime() < new Date(now).getTime();
}
