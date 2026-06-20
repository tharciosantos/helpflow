// Rate limiter simples em memória
// Funciona apenas em ambiente de servidor único (não distribuído)
// Para produção real com múltiplas instâncias, use Redis (Upstash)

const requestCounts = new Map();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const MAX_REQUESTS = 5; // máximo de tentativas por janela

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

export function checkRateLimit(identifier) {
    const now = Date.now();
    const windowStart = now - WINDOW_MS;

    // Limpar entradas expiradas para evitar memory leak
    for (const [key, record] of requestCounts.entries()) {
        if (record.firstRequest < windowStart) {
            requestCounts.delete(key);
        }
    }

    // Pegar ou inicializar o registro do identifier
    const record = requestCounts.get(identifier) || { count: 0, firstRequest: now };

    // Resetar se a janela expirou
    if (record.firstRequest < windowStart) {
        record.count = 0;
        record.firstRequest = now;
    }

    record.count += 1;
    requestCounts.set(identifier, record);

    const remaining = Math.max(0, MAX_REQUESTS - record.count);
    const isLimited = record.count > MAX_REQUESTS;

    return {
        isLimited,
        remaining,
        resetTime: record.firstRequest + WINDOW_MS,
    };
}