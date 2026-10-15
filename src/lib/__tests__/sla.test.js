import { describe, it, expect } from 'vitest';
import { SLA_HOURS, getSlaHours, computeDueAt, isOverdue } from '../sla';

describe('getSlaHours', () => {
  it('retorna as horas de cada prioridade conhecida', () => {
    expect(getSlaHours('LOW')).toBe(SLA_HOURS.LOW);
    expect(getSlaHours('URGENT')).toBe(SLA_HOURS.URGENT);
  });

  it('usa MEDIUM como fallback para prioridade desconhecida', () => {
    expect(getSlaHours('INEXISTENTE')).toBe(SLA_HOURS.MEDIUM);
    expect(getSlaHours(undefined)).toBe(SLA_HOURS.MEDIUM);
  });
});

describe('computeDueAt', () => {
  it('soma as horas do SLA à data base', () => {
    const base = new Date('2026-01-01T00:00:00.000Z');
    const due = computeDueAt('URGENT', base); // 4h
    expect(due.toISOString()).toBe('2026-01-01T04:00:00.000Z');
  });

  it('aceita string ISO como data base', () => {
    const due = computeDueAt('HIGH', '2026-01-01T00:00:00.000Z'); // 24h
    expect(due.toISOString()).toBe('2026-01-02T00:00:00.000Z');
  });

  it('prioridade desconhecida cai no SLA de MEDIUM', () => {
    const base = new Date('2026-01-01T00:00:00.000Z');
    const due = computeDueAt('X', base); // 72h = 3 dias
    expect(due.toISOString()).toBe('2026-01-04T00:00:00.000Z');
  });
});

describe('isOverdue', () => {
  const now = new Date('2026-01-10T00:00:00.000Z');

  it('é atrasado quando o prazo já passou e não está fechado', () => {
    const ticket = { dueAt: '2026-01-09T00:00:00.000Z', status: 'OPEN' };
    expect(isOverdue(ticket, now)).toBe(true);
  });

  it('não é atrasado se o prazo ainda não venceu', () => {
    const ticket = { dueAt: '2026-01-11T00:00:00.000Z', status: 'OPEN' };
    expect(isOverdue(ticket, now)).toBe(false);
  });

  it('nunca é atrasado quando o ticket está CLOSED', () => {
    const ticket = { dueAt: '2026-01-01T00:00:00.000Z', status: 'CLOSED' };
    expect(isOverdue(ticket, now)).toBe(false);
  });

  it('não é atrasado quando não há prazo definido', () => {
    expect(isOverdue({ dueAt: null, status: 'OPEN' }, now)).toBe(false);
    expect(isOverdue({}, now)).toBe(false);
  });
});
