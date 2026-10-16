import { describe, it, expect } from 'vitest';
import {
  computeFirstResponseAt,
  averageDurationMs,
  averageResolutionMs,
  averageFirstResponseMs,
  formatDuration,
} from '../metrics';

describe('computeFirstResponseAt', () => {
  it('escolhe o evento mais antigo entre histórico e comentários', () => {
    const result = computeFirstResponseAt([
      '2026-01-10T12:00:00.000Z',
      '2026-01-09T08:00:00.000Z', // mais antigo
      '2026-01-11T00:00:00.000Z',
    ]);
    expect(result.toISOString()).toBe('2026-01-09T08:00:00.000Z');
  });

  it('aceita Date e string misturados', () => {
    const result = computeFirstResponseAt([
      new Date('2026-02-02T10:00:00.000Z'),
      '2026-02-01T10:00:00.000Z',
    ]);
    expect(result.toISOString()).toBe('2026-02-01T10:00:00.000Z');
  });

  it('ignora valores nulos e inválidos', () => {
    const result = computeFirstResponseAt([null, undefined, 'data-invalida', '2026-03-01T00:00:00.000Z']);
    expect(result.toISOString()).toBe('2026-03-01T00:00:00.000Z');
  });

  it('devolve null quando não há nenhum evento válido', () => {
    expect(computeFirstResponseAt([])).toBeNull();
    expect(computeFirstResponseAt([null, 'nope'])).toBeNull();
    expect(computeFirstResponseAt()).toBeNull();
  });
});

describe('averageDurationMs', () => {
  it('calcula a média das durações válidas', () => {
    const avg = averageDurationMs([
      { from: '2026-01-01T00:00:00.000Z', to: '2026-01-01T02:00:00.000Z' }, // 2h
      { from: '2026-01-01T00:00:00.000Z', to: '2026-01-01T04:00:00.000Z' }, // 4h
    ]);
    expect(avg).toBe(3 * 60 * 60 * 1000);
  });

  it('descarta pares incompletos, inválidos ou negativos', () => {
    const avg = averageDurationMs([
      { from: '2026-01-01T00:00:00.000Z', to: '2026-01-01T01:00:00.000Z' }, // 1h válida
      { from: null, to: '2026-01-01T01:00:00.000Z' },
      { from: '2026-01-01T00:00:00.000Z', to: null },
      { from: '2026-01-01T05:00:00.000Z', to: '2026-01-01T01:00:00.000Z' }, // negativa
      { from: 'ruim', to: 'pior' },
      null,
    ]);
    expect(avg).toBe(60 * 60 * 1000);
  });

  it('devolve null quando não sobra amostra válida', () => {
    expect(averageDurationMs([])).toBeNull();
    expect(averageDurationMs([{ from: null, to: null }])).toBeNull();
    expect(averageDurationMs()).toBeNull();
  });

  it('considera duração zero como amostra válida', () => {
    const avg = averageDurationMs([
      { from: '2026-01-01T00:00:00.000Z', to: '2026-01-01T00:00:00.000Z' },
    ]);
    expect(avg).toBe(0);
  });
});

describe('averageResolutionMs', () => {
  it('usa resolvedAt - createdAt dos chamados fechados', () => {
    const avg = averageResolutionMs([
      { createdAt: '2026-01-01T00:00:00.000Z', resolvedAt: '2026-01-01T06:00:00.000Z' }, // 6h
      { createdAt: '2026-01-01T00:00:00.000Z', resolvedAt: '2026-01-01T02:00:00.000Z' }, // 2h
    ]);
    expect(avg).toBe(4 * 60 * 60 * 1000);
  });

  it('ignora chamados ainda não resolvidos', () => {
    const avg = averageResolutionMs([
      { createdAt: '2026-01-01T00:00:00.000Z', resolvedAt: '2026-01-01T03:00:00.000Z' },
      { createdAt: '2026-01-01T00:00:00.000Z', resolvedAt: null },
    ]);
    expect(avg).toBe(3 * 60 * 60 * 1000);
  });

  it('devolve null sem chamados resolvidos', () => {
    expect(averageResolutionMs([])).toBeNull();
    expect(averageResolutionMs([{ createdAt: '2026-01-01T00:00:00.000Z', resolvedAt: null }])).toBeNull();
  });
});

describe('averageFirstResponseMs', () => {
  it('usa firstResponseAt - createdAt', () => {
    const avg = averageFirstResponseMs([
      { createdAt: '2026-01-01T00:00:00.000Z', firstResponseAt: '2026-01-01T00:30:00.000Z' }, // 30min
      { createdAt: '2026-01-01T00:00:00.000Z', firstResponseAt: '2026-01-01T01:30:00.000Z' }, // 90min
    ]);
    expect(avg).toBe(60 * 60 * 1000);
  });

  it('ignora chamados sem primeira resposta', () => {
    const avg = averageFirstResponseMs([
      { createdAt: '2026-01-01T00:00:00.000Z', firstResponseAt: '2026-01-01T02:00:00.000Z' },
      { createdAt: '2026-01-01T00:00:00.000Z', firstResponseAt: null },
    ]);
    expect(avg).toBe(2 * 60 * 60 * 1000);
  });

  it('devolve null quando nenhum agente respondeu', () => {
    expect(averageFirstResponseMs([{ createdAt: '2026-01-01T00:00:00.000Z', firstResponseAt: null }])).toBeNull();
  });
});

describe('formatDuration', () => {
  const MINUTE = 60 * 1000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  it('mostra menos de um minuto', () => {
    expect(formatDuration(0)).toBe('< 1min');
    expect(formatDuration(30 * 1000)).toBe('< 1min');
  });

  it('formata minutos, horas e dias', () => {
    expect(formatDuration(12 * MINUTE)).toBe('12min');
    expect(formatDuration(HOUR)).toBe('1h');
    expect(formatDuration(HOUR + 30 * MINUTE)).toBe('1h 30min');
    expect(formatDuration(2 * DAY)).toBe('2d');
    expect(formatDuration(2 * DAY + 4 * HOUR)).toBe('2d 4h');
  });

  it('trunca segundos residuais sem arredondar para cima', () => {
    expect(formatDuration(HOUR + 59 * MINUTE + 59 * 1000)).toBe('1h 59min');
  });

  it('devolve travessão para valores não mensuráveis', () => {
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(undefined)).toBe('—');
    expect(formatDuration(-1)).toBe('—');
    expect(formatDuration(NaN)).toBe('—');
  });
});
