import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    checkDatabase,
    withTimeout,
    DatabasePingTimeoutError,
    DB_PING_TIMEOUT_MS,
} from '../healthCheck';

describe('withTimeout', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('resolve com o valor da consulta que responde a tempo', async () => {
        await expect(withTimeout(async () => 'ok', 100)).resolves.toBe('ok');
    });

    it('rejeita com DatabasePingTimeoutError quando a consulta trava', async () => {
        vi.useFakeTimers();
        const pending = withTimeout(() => new Promise(() => {}), 50);
        const assertion = expect(pending).rejects.toBeInstanceOf(DatabasePingTimeoutError);
        await vi.advanceTimersByTimeAsync(60);
        await assertion;
    });

    it('propaga o erro da própria consulta sem esperar o prazo', async () => {
        const failure = new Error('conexão recusada');
        await expect(withTimeout(async () => { throw failure; }, 10_000)).rejects.toBe(failure);
    });

    it('aceita uma consulta que devolve valor direto (não promessa)', async () => {
        await expect(withTimeout(() => 1, 100)).resolves.toBe(1);
    });

    it('aceita o prazo padrão', async () => {
        await expect(withTimeout(async () => true)).resolves.toBe(true);
        expect(DB_PING_TIMEOUT_MS).toBeLessThanOrEqual(5000);
    });
});

describe('checkDatabase', () => {
    it('reporta CONNECTED quando o ping responde', async () => {
        await expect(checkDatabase(async () => [{ '?column?': 1 }])).resolves.toEqual({
            ok: true,
            reason: 'CONNECTED',
        });
    });

    it('reporta TIMEOUT quando o ping estoura o prazo', async () => {
        const started = Date.now();
        const result = await checkDatabase(() => new Promise(() => {}), { timeoutMs: 20 });
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('TIMEOUT');
        expect(result.error).toBeInstanceOf(DatabasePingTimeoutError);
        expect(Date.now() - started).toBeLessThan(2000);
    });

    it('reporta ERROR quando o banco recusa a consulta', async () => {
        const failure = new Error('relation does not exist');
        const result = await checkDatabase(async () => { throw failure; });
        expect(result).toEqual({ ok: false, reason: 'ERROR', error: failure });
    });

    it('não lança mesmo sem função de consulta', async () => {
        const result = await checkDatabase(undefined);
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('ERROR');
    });
});
