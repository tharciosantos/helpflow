import { describe, it, expect } from 'vitest';
import { formatHistoryValue, formatHistoryText } from '../ticketHistoryFormat';

describe('formatHistoryValue', () => {
  it('formata dueAt ISO em data/hora legível', () => {
    const formatted = formatHistoryValue('dueAt', '2026-10-20T17:30:00.000Z');

    expect(formatted).toContain('20/10/2026');
    expect(formatted).toMatch(/\d{2}:\d{2}/);
    expect(formatted).not.toBe('2026-10-20T17:30:00.000Z');
  });

  it('formata dueAt gravado no formato antigo (Date.toString)', () => {
    const legacy = new Date('2026-10-20T17:30:00.000Z').toString();
    const formatted = formatHistoryValue('dueAt', legacy);

    expect(formatted).toContain('20/10/2026');
  });

  it('usa "Sem prazo" quando dueAt é nulo', () => {
    expect(formatHistoryValue('dueAt', null)).toBe('Sem prazo');
    expect(formatHistoryValue('dueAt', undefined)).toBe('Sem prazo');
  });

  it('mantém o valor bruto quando dueAt é inválido', () => {
    expect(formatHistoryValue('dueAt', 'data-invalida')).toBe('data-invalida');
  });

  it('mantém os labels de status e prioridade', () => {
    expect(formatHistoryValue('status', 'IN_PROGRESS')).toBe('Em Progresso');
    expect(formatHistoryValue('priority', 'URGENT')).toBe('Urgente');
  });

  it('trunca descrições longas', () => {
    const long = 'a'.repeat(100);
    expect(formatHistoryValue('description', long)).toBe(`${'a'.repeat(80)}...`);
  });
});

describe('formatHistoryText', () => {
  it('usa o label Prazo em vez do nome cru do campo', () => {
    const text = formatHistoryText({
      field: 'dueAt',
      from: '2026-10-20T17:30:00.000Z',
      to: null,
    });

    expect(text).toContain('Prazo:');
    expect(text).toContain('20/10/2026');
    expect(text).toContain('→ Sem prazo');
    expect(text).not.toContain('dueAt');
  });

  it('resolve nomes de responsáveis pelo mapa', () => {
    const text = formatHistoryText(
      { field: 'agentId', from: 'agent-1', to: 'agent-2' },
      { 'agent-1': 'Ana', 'agent-2': 'Bruno' }
    );

    expect(text).toBe('Responsável: Ana → Bruno');
  });
});
