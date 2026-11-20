import { describe, expect, it } from 'vitest';
import {
    buildOptimisticWhere,
    getUpdatedAtWindow,
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

    it('aceita quando o registro avançou dentro da tolerância', () => {
        // Edição feita pelo próprio usuário segundos depois de carregar o
        // chamado: o ISO perde frações e o update é o mesmo da tela.
        expect(isUpdatedAtCurrent(ISO, '2026-11-12T10:00:00.950Z')).toBe(true);
    });

    it('rejeita quando o registro mudou além da tolerância', () => {
        expect(isUpdatedAtCurrent(ISO, '2026-11-12T10:00:02.000Z')).toBe(false);
        expect(isUpdatedAtCurrent(ISO, '2026-11-12T09:59:58.000Z')).toBe(false);
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

describe('getUpdatedAtWindow', () => {
    it('abre uma janela de ±1s em volta do valor esperado', () => {
        const window = getUpdatedAtWindow(ISO);
        expect(window.gte.toISOString()).toBe('2026-11-12T09:59:59.000Z');
        expect(window.lte.toISOString()).toBe('2026-11-12T10:00:01.000Z');
    });

    it('devolve null para valor ausente ou inválido', () => {
        expect(getUpdatedAtWindow(undefined)).toBeNull();
        expect(getUpdatedAtWindow('lixo')).toBeNull();
    });
});

describe('buildOptimisticWhere', () => {
    it('sem valor esperado, filtra só pelo id (comportamento antigo)', () => {
        expect(buildOptimisticWhere('t1', undefined)).toEqual({ id: 't1' });
        expect(buildOptimisticWhere('t1', null)).toEqual({ id: 't1' });
    });

    it('com valor esperado, condiciona a escrita à janela do updatedAt', () => {
        const where = buildOptimisticWhere('t1', ISO);
        expect(where.id).toBe('t1');
        expect(where.updatedAt.gte).toBeInstanceOf(Date);
        expect(where.updatedAt.gte.toISOString()).toBe('2026-11-12T09:59:59.000Z');
        expect(where.updatedAt.lte).toBeInstanceOf(Date);
        expect(where.updatedAt.lte.toISOString()).toBe('2026-11-12T10:00:01.000Z');
    });

    it('não usa igualdade exata (evita 409 falso por frações de segundo)', () => {
        const { updatedAt } = buildOptimisticWhere('t1', ISO);
        expect(updatedAt).toEqual({
            gte: expect.any(Date),
            lte: expect.any(Date),
        });
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
