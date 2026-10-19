import { describe, it, expect } from 'vitest';
import {
  SLA_HOURS,
  getSlaHours,
  computeDueAt,
  isOverdue,
  parseDueAtInput,
  resolveDueAtUpdate,
  calendarDayDiff,
} from '../sla';

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

describe('parseDueAtInput', () => {
  it('aceita ISO com Z', () => {
    expect(parseDueAtInput('2026-10-20T17:30:00.000Z').toISOString())
      .toBe('2026-10-20T17:30:00.000Z');
  });

  it('aceita ISO com offset explícito', () => {
    expect(parseDueAtInput('2026-10-20T14:30:00-03:00').toISOString())
      .toBe('2026-10-20T17:30:00.000Z');
  });

  it('rejeita datetime sem offset (fuso ambíguo entre servidor e cliente)', () => {
    expect(parseDueAtInput('2026-10-20T14:30')).toBeNull();
    expect(parseDueAtInput('2026-10-20')).toBeNull();
  });

  it('rejeita valores vazios, inválidos e não-string', () => {
    expect(parseDueAtInput('')).toBeNull();
    expect(parseDueAtInput('amanhã')).toBeNull();
    expect(parseDueAtInput(null)).toBeNull();
    expect(parseDueAtInput(undefined)).toBeNull();
  });
});

describe('resolveDueAtUpdate', () => {
  it('dá precedência ao prazo manual', () => {
    expect(resolveDueAtUpdate({ bodyDueAt: '2026-10-20T17:30:00.000Z' })).toBe('manual');
    expect(resolveDueAtUpdate({
      bodyDueAt: '2026-10-20T17:30:00.000Z',
      recalcDue: true,
      priority: 'HIGH',
      ticketPriority: 'LOW',
    })).toBe('manual');
  });

  it('permite limpar o prazo com null', () => {
    expect(resolveDueAtUpdate({ bodyDueAt: null, recalcDue: true })).toBe('clear');
  });

  it('recalcula somente quando recalcDue=true e a prioridade mudou', () => {
    expect(resolveDueAtUpdate({
      recalcDue: true,
      priority: 'HIGH',
      ticketPriority: 'LOW',
    })).toBe('recalc');

    expect(resolveDueAtUpdate({
      recalcDue: true,
      priority: 'LOW',
      ticketPriority: 'LOW',
    })).toBe('keep');

    expect(resolveDueAtUpdate({
      recalcDue: false,
      priority: 'HIGH',
      ticketPriority: 'LOW',
    })).toBe('keep');
  });

  it('mantém o prazo quando nada foi enviado', () => {
    expect(resolveDueAtUpdate({})).toBe('keep');
  });
});

describe('calendarDayDiff', () => {
  // Datas locais de propósito: o resumo do formulário usa o calendário do
  // navegador. Hoje às 14:30 é "hoje", não "amanhã".
  const now = new Date(2026, 9, 19, 12, 0, 0);

  it('retorna 0 para o mesmo dia, mesmo com poucas horas de diferença', () => {
    expect(calendarDayDiff(now, new Date(2026, 9, 19, 14, 30))).toBe(0);
    expect(calendarDayDiff(now, new Date(2026, 9, 19, 23, 59))).toBe(0);
  });

  it('retorna 1 para o dia seguinte e -1 para o anterior', () => {
    expect(calendarDayDiff(now, new Date(2026, 9, 20, 9, 0))).toBe(1);
    expect(calendarDayDiff(now, new Date(2026, 9, 18, 18, 0))).toBe(-1);
  });

  it('ignora a hora ao comparar dias', () => {
    expect(calendarDayDiff(
      new Date(2026, 9, 19, 23, 59),
      new Date(2026, 9, 20, 0, 0)
    )).toBe(1);
  });

  it('devolve null para datas inválidas', () => {
    expect(calendarDayDiff(null, now)).toBeNull();
    expect(calendarDayDiff(now, new Date('inválida'))).toBeNull();
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
