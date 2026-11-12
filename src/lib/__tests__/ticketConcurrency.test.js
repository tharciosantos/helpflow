import { describe, expect, it } from 'vitest';
import {
    buildOptimisticWhere,
    isUpdatedAtCurrent,
    parseExpectedUpdatedAt,
    CONFLICT_MESSAGE,
} from '../ticketConcurrency';

const ISO = '2026-11-12T10:00:00.000Z';

describe('parseExpectedUpdatedAt', () => {
    it('aceita string ISO válida', () => {
        const parsed = parseExpectedUpdatedAt(ISO);
        expect(parsed).toBeInstanceOf(Date);
        expect(parsed.toISOString()).toBe(ISO);
    });

    it('aceita Date', () => {
        const date = new Date(ISO);
        expect(parseExpectedUpdatedAt(date)).toBe(date);
    });

    it('trata ausência como nulo (verificação desligada)', () => {
        expect(parseExpectedUpdatedAt(undefined)).toBeNull();
        expect(parseExpectedUpdatedAt(null)).toBeNull();
        expect(parseExpectedUpdatedAt('')).toBeNull();
    });

    it('rejeita strings inválidas e tipos inesperados', () => {
        expect(parseExpectedUpdatedAt('não é data')).toBeNull();
        expect(parseExpectedUpdatedAt(42)).toBeNull();
        expect(parseExpectedUpdatedAt({})).toBeNull();
        expect(parseExpectedUpdatedAt(new Date('inválida'))).toBeNull();
    });
});

describe('isUpdatedAtCurrent', () => {
    it('aceita quando o valor esperado é igual ao atual', () => {
        expect(isUpdatedAtCurrent(ISO, ISO)).toBe(true);
    });

    it('aceita strings equivalentes em formatos diferentes', () => {
        expect(isUpdatedAtCurrent('2026-11-12T10:00:00Z', ISO)).toBe(true);
    });

    it('tolera diferença de até 1 segundo (precisão de relógio)', () => {
        expect(isUpdatedAtCurrent(ISO, '2026-11-12T10:00:00.900Z')).toBe(true);
    });

    it('rejeita quando o registro mudou além da tolerância', () => {
        expect(isUpdatedAtCurrent(ISO, '2026-11-12T10:00:05.000Z')).toBe(false);
        expect(isUpdatedAtCurrent(ISO, '2026-11-12T09:59:00.000Z')).toBe(false);
    });

    it('pula a verificação quando não há valor esperado', () => {
        expect(isUpdatedAtCurrent(undefined, ISO)).toBe(true);
        expect(isUpdatedAtCurrent(null, ISO)).toBe(true);
    });

    it('rejeita quando há valor esperado mas o atual é inválido', () => {
        expect(isUpdatedAtCurrent(ISO, null)).toBe(false);
        expect(isUpdatedAtCurrent(ISO, 'lixo')).toBe(false);
    });
});

describe('buildOptimisticWhere', () => {
    it('sem valor esperado, filtra só pelo id (comportamento antigo)', () => {
        expect(buildOptimisticWhere('t1', undefined)).toEqual({ id: 't1' });
        expect(buildOptimisticWhere('t1', null)).toEqual({ id: 't1' });
    });

    it('com valor esperado, condiciona a escrita ao updatedAt', () => {
        const where = buildOptimisticWhere('t1', ISO);
        expect(where.id).toBe('t1');
        expect(where.updatedAt).toBeInstanceOf(Date);
        expect(where.updatedAt.toISOString()).toBe(ISO);
    });

    it('ignora valor esperado inválido em vez de quebrar', () => {
        expect(buildOptimisticWhere('t1', 'lixo')).toEqual({ id: 't1' });
    });
});

describe('CONFLICT_MESSAGE', () => {
    it('explica o conflito e orienta o usuário', () => {
        expect(CONFLICT_MESSAGE).toMatch(/alterado por outra pessoa/i);
        expect(CONFLICT_MESSAGE).toMatch(/[Rr]ecarregue/);
    });
});
