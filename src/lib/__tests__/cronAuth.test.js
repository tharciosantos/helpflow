import { describe, it, expect } from 'vitest';
import { isCronAuthorized } from '../cronAuth.js';

describe('isCronAuthorized', () => {
    it('autoriza quando o header confere com o segredo', () => {
        expect(isCronAuthorized({
            authHeader: 'Bearer segredo-forte',
            secret: 'segredo-forte',
        })).toBe(true);
    });

    it('rejeita quando CRON_SECRET não está configurado', () => {
        expect(isCronAuthorized({
            authHeader: 'Bearer undefined',
            secret: undefined,
        })).toBe(false);
    });

    it('rejeita "Bearer undefined" mesmo com segredo vazio', () => {
        expect(isCronAuthorized({
            authHeader: 'Bearer undefined',
            secret: '',
        })).toBe(false);
    });

    it('rejeita quando o header está ausente', () => {
        expect(isCronAuthorized({
            authHeader: null,
            secret: 'segredo-forte',
        })).toBe(false);
    });

    it('rejeita token incorreto de mesmo tamanho', () => {
        expect(isCronAuthorized({
            authHeader: 'Bearer segredo-fals0',
            secret: 'segredo-forte',
        })).toBe(false);
    });

    it('rejeita token com tamanho diferente', () => {
        expect(isCronAuthorized({
            authHeader: 'Bearer curto',
            secret: 'segredo-forte',
        })).toBe(false);
    });
});
