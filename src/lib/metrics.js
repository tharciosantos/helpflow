// Métricas de atendimento: primeira resposta, tempo médio e formatação.
// Funções puras — recebem dados já lidos do banco, sem Prisma nem HTTP.

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

// Amostra das resoluções mais recentes que entra nas médias.
export const METRICS_SAMPLE_LIMIT = 500;

function toTime(value) {
  if (value === null || value === undefined) return null;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

export function computeFirstResponseAt(events = []) {
  const times = events.map(toTime).filter((time) => time !== null);
  if (times.length === 0) return null;
  return new Date(Math.min(...times));
}

export function averageDurationMs(pairs = []) {
  const durations = [];
  for (const pair of pairs) {
    const from = toTime(pair?.from);
    const to = toTime(pair?.to);
    if (from === null || to === null) continue;
    const diff = to - from;
    if (diff < 0) continue;
    durations.push(diff);
  }
  if (durations.length === 0) return null;
  return durations.reduce((total, duration) => total + duration, 0) / durations.length;
}

export function averageResolutionMs(tickets = []) {
  return averageDurationMs(tickets.map((t) => ({ from: t?.createdAt, to: t?.resolvedAt })));
}

export function averageFirstResponseMs(tickets = []) {
  return averageDurationMs(tickets.map((t) => ({ from: t?.createdAt, to: t?.firstResponseAt })));
}

export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  if (ms < MINUTE_MS) return '< 1min';

  const days = Math.floor(ms / DAY_MS);
  const hours = Math.floor((ms % DAY_MS) / HOUR_MS);
  const minutes = Math.floor((ms % HOUR_MS) / MINUTE_MS);

  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  return `${minutes}min`;
}
