import { describe, expect, it } from 'vitest';
import {
    classifyLoadResult,
    getConnectionNotice,
    getUnreadSummary,
    nextPollDelay,
    POLL_INTERVAL_MS,
} from '../notificationConnection';

describe('classifyLoadResult', () => {
    it('marca sucesso quando a resposta é ok', () => {
        expect(classifyLoadResult({ ok: true, status: 200 })).toBe('success');
    });

    it('marca falha para erro de servidor', () => {
        expect(classifyLoadResult({ ok: false, status: 500 })).toBe('failure');
        expect(classifyLoadResult({ ok: false, status: 503 })).toBe('failure');
    });

    it('marca falha quando não houve resposta (rede caiu)', () => {
        expect(classifyLoadResult({ ok: false })).toBe('failure');
        expect(classifyLoadResult()).toBe('failure');
    });

    it('separa problemas de autorização das falhas de conexão', () => {
        expect(classifyLoadResult({ ok: false, status: 401 })).toBe('unauthorized');
        expect(classifyLoadResult({ ok: false, status: 403 })).toBe('unauthorized');
    });
});

describe('getConnectionNotice', () => {
    it('não exibe aviso quando está sincronizado', () => {
        expect(getConnectionNotice({ failures: 0, kind: 'success' })).toBeNull();
    });

    it('exibe aviso na primeira falha', () => {
        const notice = getConnectionNotice({ failures: 1, kind: 'failure' });
        expect(notice).not.toBeNull();
        expect(notice.tone).toBe('warning');
        expect(notice.title).toMatch(/sem conex/i);
    });

    it('agrava a descrição após várias falhas seguidas', () => {
        const primeira = getConnectionNotice({ failures: 1, kind: 'failure' });
        const varias = getConnectionNotice({ failures: 3, kind: 'failure' });
        expect(varias.description).not.toBe(primeira.description);
        expect(varias.description).toMatch(/h[áa] várias tentativas/i);
    });

    it('não avisa sobre rede quando o problema é de autorização', () => {
        expect(getConnectionNotice({ failures: 2, kind: 'unauthorized' })).toBeNull();
    });

    it('volta ao normal depois de um sucesso', () => {
        expect(getConnectionNotice({ failures: 0, kind: 'success' })).toBeNull();
    });
});

describe('nextPollDelay', () => {
    it('usa o intervalo normal sem falhas', () => {
        expect(nextPollDelay(0)).toBe(POLL_INTERVAL_MS);
    });

    it('dobra o intervalo a cada falha', () => {
        expect(nextPollDelay(1)).toBe(POLL_INTERVAL_MS * 2);
        expect(nextPollDelay(2)).toBe(POLL_INTERVAL_MS * 4);
    });

    it('respeita o teto de 5 minutos', () => {
        const teto = 5 * 60 * 1000;
        expect(nextPollDelay(4)).toBeLessThanOrEqual(teto);
        expect(nextPollDelay(10)).toBe(teto);
    });

    it('ignora valores negativos ou inválidos', () => {
        expect(nextPollDelay(-1)).toBe(POLL_INTERVAL_MS);
    });
});

describe('getUnreadSummary', () => {
    it('mostra "Tudo em dia" sem não lidas', () => {
        expect(getUnreadSummary({ unreadCount: 0, failures: 0 })).toBe('Tudo em dia');
    });

    it('usa singular e plural corretamente', () => {
        expect(getUnreadSummary({ unreadCount: 1 })).toBe('1 não lida');
        expect(getUnreadSummary({ unreadCount: 3 })).toBe('3 não lidas');
    });

    it('não afirma "Tudo em dia" quando o estado é desconhecido', () => {
        const label = getUnreadSummary({ unreadCount: 0, failures: 1 });
        expect(label).not.toBe('Tudo em dia');
        expect(label).toMatch(/desatualizado/i);
    });
});
