// Rate limiting com Upstash Redis (distribuído) + fallback em memória (dev/single-instance).
// Uso: const { isLimited, remaining, resetTime } = await checkRateLimit(`register:${ip}`);
// Login: ver src/lib/loginRateLimit.js (chaves `login:` por e-mail e `login-ip:` por IP).
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const IPv4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPv6 = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

export function getClientIp(req) {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
        const first = forwarded.split(',')[0].trim();
        if (IPv4.test(first) || IPv6.test(first)) return first;
    }

    const realIp = req.headers.get('x-real-ip');
    if (realIp) {
        const ip = realIp.trim();
        if (IPv4.test(ip) || IPv6.test(ip)) return ip;
    }

    return 'unknown';
}

// --- Fallback em memória (apenas quando Upstash não está configurado) ---
const requestCounts = new Map();
const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const DEFAULT_MAX_REQUESTS = 5;

function checkMemoryRateLimit(identifier, { windowMs = DEFAULT_WINDOW_MS, maxRequests = DEFAULT_MAX_REQUESTS } = {}) {
    const now = Date.now();
    const windowStart = now - windowMs;

    for (const [key, record] of requestCounts.entries()) {
        if (record.firstRequest < windowStart) {
            requestCounts.delete(key);
        }
    }

    const record = requestCounts.get(identifier) || { count: 0, firstRequest: now };

    if (record.firstRequest < windowStart) {
        record.count = 0;
        record.firstRequest = now;
    }

    record.count += 1;
    requestCounts.set(identifier, record);

    const remaining = Math.max(0, maxRequests - record.count);
    const isLimited = record.count > maxRequests;

    return {
        isLimited,
        remaining,
        resetTime: record.firstRequest + windowMs,
    };
}

export function _clearMemoryRateLimits() {
    requestCounts.clear();
}

// Zera um contador (ex.: login aceito). Só o fallback em memória tem contador
// local para zerar; no Upstash a própria janela deslizante se encarrega.
export function resetRateLimit(identifier) {
    requestCounts.delete(identifier);
}

// --- Upstash (distribuído) ---
let redis = null;
let limiters = new Map();
const RATE_LIMIT_PREFIX = 'helpflow:ratelimit';

function getRedis() {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return null;
    if (!redis) {
        redis = Redis.fromEnv();
    }
    return redis;
}

function getLimiter(windowMs, maxRequests) {
    const key = `${windowMs}:${maxRequests}`;
    if (!limiters.has(key)) {
        const client = getRedis();
        if (!client) return null;
        // Upstash aceita "15 m", "60 s" etc. Convertemos windowMs para segundos.
        const seconds = Math.max(1, Math.round(windowMs / 1000));
        limiters.set(
            key,
            new Ratelimit({
                redis: client,
                limiter: Ratelimit.slidingWindow(maxRequests, `${seconds} s`),
                analytics: true,
                prefix: RATE_LIMIT_PREFIX,
            })
        );
    }
    return limiters.get(key);
}

/**
 * E2E: dev/testes com CYPRESS_TEST_SECRET definido rodam dezenas de cadastros
 * no mesmo IP e caem no limite. A exceção só vale com o segredo configurado e
 * para as chaves `register:*`/`login:*`/`login-ip:*`; produção fica sempre limitada.
 */
function isTestBypass(identifier) {
    if (process.env.NODE_ENV === 'production') return false;
    if (!process.env.CYPRESS_TEST_SECRET) return false;
    return identifier.startsWith('register:') || identifier.startsWith('login:') || identifier.startsWith('login-ip:');
}

export async function checkRateLimit(identifier, { windowMs = DEFAULT_WINDOW_MS, maxRequests = DEFAULT_MAX_REQUESTS } = {}) {
    if (isTestBypass(identifier)) {
        return { isLimited: false, remaining: maxRequests, resetTime: Date.now() + windowMs };
    }

    const limiter = getRedis() ? getLimiter(windowMs, maxRequests) : null;

    if (!limiter) {
        if (process.env.NODE_ENV === 'production') {
            console.warn('[rateLimiter] UPSTASH_REDIS_* ausente — usando fallback em memória (não distribuído).');
        }
        return checkMemoryRateLimit(identifier, { windowMs, maxRequests });
    }

    try {
        const { success, remaining, reset } = await limiter.limit(identifier);
        return {
            isLimited: !success,
            remaining: typeof remaining === 'number' ? remaining : 0,
            resetTime: typeof reset === 'number' ? reset : Date.now() + windowMs,
        };
    } catch (error) {
        console.error('[rateLimiter] Falha no Upstash, usando fallback em memória:', error?.message);
        return checkMemoryRateLimit(identifier, { windowMs, maxRequests });
    }
}

/**
 * Login aceito: limpa o histórico de falhas do próprio usuário. No Upstash, a
 * chave em uso leva o prefixo fixo e um sufixo de tipo (`login:<epoch>:<email>`);
 * no fallback em memória a chave é exatamente o identificador. Excluir pelo
 * sufixo `:<identifier>` cobre os dois formatos sem apagar `x@a.com` quando o
 * login é de `ax@a.com`.
 */
export async function resetRateLimits(identifiers) {
    for (const identifier of identifiers) {
        requestCounts.delete(identifier);

        const client = getRedis();
        if (!client) continue;

        try {
            let cursor = '0';
            do {
                const [next, keys] = await client.scan(cursor, { match: `${RATE_LIMIT_PREFIX}*:${identifier}`, count: 100 });
                cursor = String(next);
                if (keys.length > 0) await client.del(...keys);
            } while (cursor !== '0');
        } catch (error) {
            console.error('[rateLimiter] Falha ao limpar contador no Upstash:', error?.message);
        }
    }
}

export function buildRateLimitHeaders({ remaining = 0, resetTime = Date.now() } = {}) {
    const retryAfter = Math.max(0, Math.ceil((resetTime - Date.now()) / 1000));
    return {
        'X-RateLimit-Remaining': String(remaining),
        'Retry-After': String(retryAfter),
    };
}
