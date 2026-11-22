// Health check do banco (AUD-39).
//
// Antes a rota fazia `prisma.user.findFirst()`: lia uma linha de uma tabela de
// negócio sem limite de tempo. Com o banco lento, a rota pública ficava presa
// até o timeout padrão do Prisma. Agora é um `SELECT 1` com prazo curto.

export const DB_PING_TIMEOUT_MS = 3000;

export class DatabasePingTimeoutError extends Error {
    constructor(timeoutMs) {
        super(`Banco não respondeu em ${timeoutMs}ms`);
        this.name = 'DatabasePingTimeoutError';
    }
}

/**
 * Corre `operation` com prazo máximo; rejeita com `DatabasePingTimeoutError`
 * quando estoura. Erros da própria consulta passam como vieram.
 */
export function withTimeout(operation, timeoutMs = DB_PING_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new DatabasePingTimeoutError(timeoutMs)), timeoutMs);

        Promise.resolve()
            .then(() => operation())
            .then(
                (value) => {
                    clearTimeout(timer);
                    resolve(value);
                },
                (error) => {
                    clearTimeout(timer);
                    reject(error);
                },
            );
    });
}

/**
 * Ping do banco: `SELECT 1` pelo cliente Prisma, que devolve só o status. Nunca
 * lança — a rota decide o código HTTP a partir de `reason`.
 *
 * @param {() => Promise<unknown>} ping
 * @returns {Promise<{ ok: boolean, reason: 'CONNECTED' | 'TIMEOUT' | 'ERROR', error?: Error }>}
 */
export async function checkDatabase(ping, { timeoutMs = DB_PING_TIMEOUT_MS } = {}) {
    try {
        await withTimeout(ping, timeoutMs);
        return { ok: true, reason: 'CONNECTED' };
    } catch (error) {
        return {
            ok: false,
            reason: error instanceof DatabasePingTimeoutError ? 'TIMEOUT' : 'ERROR',
            error,
        };
    }
}
