// Formatação dos eventos de TicketHistory exibidos na timeline do chamado.
// Funções puras: recebem as strings gravadas em `from`/`to` e devolvem texto
// legível. Ficam fora do componente para serem testáveis sem React/DOM.

const FIELD_LABELS = {
  status: 'Status',
  priority: 'Prioridade',
  agentId: 'Responsável',
  title: 'Título',
  description: 'Descrição',
  dueAt: 'Prazo',
};

const STATUS_LABELS = { OPEN: 'Aberto', IN_PROGRESS: 'Em Progresso', CLOSED: 'Fechado' };
const PRIORITY_LABELS = { LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', URGENT: 'Urgente' };

function formatDueAt(value) {
  if (value === null || value === undefined || value === '') return 'Sem prazo';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatHistoryValue(field, value) {
  if (field === 'dueAt') return formatDueAt(value);
  if (value === null || value === undefined) return 'Não atribuído';
  if (field === 'status') return STATUS_LABELS[value] ?? value;
  if (field === 'priority') return PRIORITY_LABELS[value] ?? value;
  if (field === 'description') return value.length > 80 ? `${value.slice(0, 80)}...` : value;
  return value;
}

export function formatHistoryText(entry, actorNameMap = {}) {
  const field = FIELD_LABELS[entry.field] ?? entry.field;
  const from = formatHistoryValue(entry.field, entry.from);
  const to = formatHistoryValue(entry.field, entry.to);

  if (entry.field === 'agentId') {
    const fromName = entry.from ? (actorNameMap[entry.from] ?? 'Membro') : 'Não atribuído';
    const toName = entry.to ? (actorNameMap[entry.to] ?? 'Membro') : 'Não atribuído';
    return `${field}: ${fromName} → ${toName}`;
  }

  return `${field}: ${from} → ${to}`;
}
