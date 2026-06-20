import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkRateLimit } from '../rateLimiter';

describe('checkRateLimit', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('deve permitir requisições dentro do limite', () => {
        const result = checkRateLimit('user-1');
        expect(result.isLimited).toBe(false);
        expect(result.remaining).toBe(4);
    });

    it('deve permitir até 5 requisições na mesma janela', () => {
        for (let i = 0; i < 5; i++) {
            const result = checkRateLimit('user-2');
            expect(result.isLimited).toBe(false);
        }
    });

    it('deve bloquear na 6ª requisição', () => {
        for (let i = 0; i < 5; i++) {
            checkRateLimit('user-3');
        }
        const result = checkRateLimit('user-3');
        expect(result.isLimited).toBe(true);
        expect(result.remaining).toBe(0);
    });

    it('deve manter contadores separados por identificador', () => {
        for (let i = 0; i < 5; i++) {
            checkRateLimit('user-a');
        }
        const resultA = checkRateLimit('user-a');
        expect(resultA.isLimited).toBe(true);

        const resultB = checkRateLimit('user-b');
        expect(resultB.isLimited).toBe(false);
        expect(resultB.remaining).toBe(4);
    });

    it('deve resetar o contador após a janela de 15 minutos', () => {
        for (let i = 0; i < 5; i++) {
            checkRateLimit('user-4');
        }
        const limited = checkRateLimit('user-4');
        expect(limited.isLimited).toBe(true);

        vi.setSystemTime(new Date('2026-01-01T00:15:01.000Z'));

        const afterReset = checkRateLimit('user-4');
        expect(afterReset.isLimited).toBe(false);
        expect(afterReset.remaining).toBe(4);
    });

    it('deve retornar remaining correto a cada requisição', () => {
        expect(checkRateLimit('user-5').remaining).toBe(4);
        expect(checkRateLimit('user-5').remaining).toBe(3);
        expect(checkRateLimit('user-5').remaining).toBe(2);
        expect(checkRateLimit('user-5').remaining).toBe(1);
        expect(checkRateLimit('user-5').remaining).toBe(0);
        expect(checkRateLimit('user-5').remaining).toBe(0);
    });

    it('deve retornar resetTime dentro da janela de 15 minutos', () => {
        const result = checkRateLimit('user-6');
        const expectedReset = Date.now() + 15 * 60 * 1000;
        expect(result.resetTime).toBe(expectedReset);
    });

    it('deve funcionar com múltiplos identificadores ao mesmo tempo', () => {
        for (let i = 0; i < 5; i++) {
            checkRateLimit('ip-1');
            checkRateLimit('ip-2');
        }
        expect(checkRateLimit('ip-1').isLimited).toBe(true);
        expect(checkRateLimit('ip-2').isLimited).toBe(true);
        expect(checkRateLimit('ip-3').isLimited).toBe(false);
    });
});
