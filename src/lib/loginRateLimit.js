// Limites de tentativa de login (AUD-38).
//
// O limite por e-mail sozinho deixava qualquer um bloquear a conta de outra
// pessoa: bastava acertar o endereço (exposto em GET /api/agents) e errar a
// senha 6 vezes. Por isso o e-mail tem um teto bem mais frouxo, que só pesa
// contra quem insiste no mesmo alvo vindo de muitos IPs, e o limite apertado
// passa a ser por IP (o atacante de um só IP trava a si mesmo).

export const EMAIL_LOGIN_MAX_ATTEMPTS = 20;

/**
 * @param {{ email: string, ip?: string|null }} input
 * @returns {{ key: string, maxRequests: number }[]}
 */
export function buildLoginRateLimits({ email, ip } = {}) {
    const limits = [
        { key: `login:${normalizeEmail(email)}`, maxRequests: EMAIL_LOGIN_MAX_ATTEMPTS },
    ];

    // Sem IP confiável (`unknown`) não há chave por pessoa: cai só no e-mail.
    if (ip && ip !== 'unknown') {
        limits.push({ key: `login-ip:${ip}`, maxRequests: 10 });
    }

    return limits;
}

/**
 * Contadores a zerar depois de um login aceito. Limpar o contador do próprio
 * usuário (e-mail e IP) é o par natural do reset: quem acertou a senha não
 * carrega as falhas anteriores para a próxima janela.
 */
export function buildLoginResetKeys({ email, ip } = {}) {
    const keys = [`login:${normalizeEmail(email)}`];
    if (ip && ip !== 'unknown') {
        keys.push(`login-ip:${ip}`);
    }
    return keys;
}

export function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}
