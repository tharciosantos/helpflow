import { describe, it, expect } from 'vitest';
import {
    EMAIL_LOGIN_MAX_ATTEMPTS,
    buildLoginRateLimits,
    buildLoginResetKeys,
    normalizeEmail,
} from '../loginRateLimit';

describe('normalizeEmail', () => {
    it('apara e baixa a caixa', () => {
        expect(normalizeEmail('  Joao@Empresa.com ')).toBe('joao@empresa.com');
    });

    it('tolera valores vazios', () => {
        expect(normalizeEmail(undefined)).toBe('');
        expect(normalizeEmail(null)).toBe('');
    });
});

describe('buildLoginRateLimits', () => {
    it('aplica o teto frouxo por e-mail', () => {
        const [emailLimit] = buildLoginRateLimits({ email: 'x@a.com', ip: '203.0.113.7' });
        expect(emailLimit).toEqual({ key: 'login:x@a.com', maxRequests: EMAIL_LOGIN_MAX_ATTEMPTS });
        expect(EMAIL_LOGIN_MAX_ATTEMPTS).toBeGreaterThan(10);
    });

    it('aplica o teto apertado por IP', () => {
        const limits = buildLoginRateLimits({ email: 'x@a.com', ip: '203.0.113.7' });
        expect(limits).toHaveLength(2);
        expect(limits[1]).toEqual({ key: 'login-ip:203.0.113.7', maxRequests: 10 });
    });

    it('normaliza o e-mail na chave', () => {
        const [emailLimit] = buildLoginRateLimits({ email: '  X@A.com ', ip: null });
        expect(emailLimit.key).toBe('login:x@a.com');
    });

    it('sem IP confiável fica só com o limite por e-mail', () => {
        expect(buildLoginRateLimits({ email: 'x@a.com', ip: null })).toHaveLength(1);
        expect(buildLoginRateLimits({ email: 'x@a.com', ip: 'unknown' })).toHaveLength(1);
        expect(buildLoginRateLimits({ email: 'x@a.com' })).toHaveLength(1);
    });
});

describe('buildLoginResetKeys', () => {
    it('devolve as chaves de e-mail e IP para zerar', () => {
        expect(buildLoginResetKeys({ email: ' X@A.com ', ip: '203.0.113.7' }))
            .toEqual(['login:x@a.com', 'login-ip:203.0.113.7']);
    });

    it('omite o IP quando não é confiável', () => {
        expect(buildLoginResetKeys({ email: 'x@a.com', ip: 'unknown' })).toEqual(['login:x@a.com']);
    });
});
