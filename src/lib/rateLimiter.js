// Rate limiting com Upstash Redis (distribuído) + fallback em memória (dev/single-instance).
// Uso: const { isLimited, remaining, resetTime } = await checkRateLimit(`login:${email}`);
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

// --- Upstash (distribuído) ---
let redis = null;
let limiters = new Map();

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
                prefix: 'helpflow:ratelimit',
            })
        );
    }
    return limiters.get(key);
}

export async function checkRateLimit(identifier, { windowMs = DEFAULT_WINDOW_MS, maxRequests = DEFAULT_MAX_REQUESTS } = {}) {
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

export function buildRateLimitHeaders({ remaining = 0, resetTime = Date.now() } = {}) {
    const retryAfter = Math.max(0, Math.ceil((resetTime - Date.now()) / 1000));
    return {
        'X-RateLimit-Remaining': String(remaining),
        'Retry-After': String(retryAfter),
    };
}
