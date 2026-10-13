import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkRateLimit, _clearMemoryRateLimits, buildRateLimitHeaders } from '../rateLimiter';

describe('checkRateLimit', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
        _clearMemoryRateLimits();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('deve permitir requisições dentro do limite', async () => {
        const result = await checkRateLimit('user-1');
        expect(result.isLimited).toBe(false);
        expect(result.remaining).toBe(4);
    });

    it('deve permitir até 5 requisições na mesma janela', async () => {
        for (let i = 0; i < 5; i++) {
            const result = await checkRateLimit('user-2');
            expect(result.isLimited).toBe(false);
        }
    });

    it('deve bloquear na 6ª requisição', async () => {
        for (let i = 0; i < 5; i++) {
            await checkRateLimit('user-3');
        }
        const result = await checkRateLimit('user-3');
        expect(result.isLimited).toBe(true);
        expect(result.remaining).toBe(0);
    });

    it('deve manter contadores separados por identificador', async () => {
        for (let i = 0; i < 5; i++) {
            await checkRateLimit('user-a');
        }
        const resultA = await checkRateLimit('user-a');
        expect(resultA.isLimited).toBe(true);

        const resultB = await checkRateLimit('user-b');
        expect(resultB.isLimited).toBe(false);
        expect(resultB.remaining).toBe(4);
    });

    it('deve resetar o contador após a janela de 15 minutos', async () => {
        for (let i = 0; i < 5; i++) {
            await checkRateLimit('user-4');
        }
        const limited = await checkRateLimit('user-4');
        expect(limited.isLimited).toBe(true);

        vi.setSystemTime(new Date('2026-01-01T00:15:01.000Z'));

        const afterReset = await checkRateLimit('user-4');
        expect(afterReset.isLimited).toBe(false);
        expect(afterReset.remaining).toBe(4);
    });

    it('deve retornar remaining correto a cada requisição', async () => {
        expect((await checkRateLimit('user-5')).remaining).toBe(4);
        expect((await checkRateLimit('user-5')).remaining).toBe(3);
        expect((await checkRateLimit('user-5')).remaining).toBe(2);
        expect((await checkRateLimit('user-5')).remaining).toBe(1);
        expect((await checkRateLimit('user-5')).remaining).toBe(0);
        expect((await checkRateLimit('user-5')).remaining).toBe(0);
    });

    it('deve retornar resetTime dentro da janela de 15 minutos', async () => {
        const result = await checkRateLimit('user-6');
        const expectedReset = Date.now() + 15 * 60 * 1000;
        expect(result.resetTime).toBe(expectedReset);
    });

    it('deve funcionar com múltiplos identificadores ao mesmo tempo', async () => {
        for (let i = 0; i < 5; i++) {
            await checkRateLimit('ip-1');
            await checkRateLimit('ip-2');
        }
        expect((await checkRateLimit('ip-1')).isLimited).toBe(true);
        expect((await checkRateLimit('ip-2')).isLimited).toBe(true);
        expect((await checkRateLimit('ip-3')).isLimited).toBe(false);
    });

    it('buildRateLimitHeaders gera Retry-After consistente', () => {
        const headers = buildRateLimitHeaders({ remaining: 0, resetTime: Date.now() + 900 * 1000 });
        expect(headers['X-RateLimit-Remaining']).toBe('0');
        expect(Number(headers['Retry-After'])).toBeGreaterThan(800);
    });
});
