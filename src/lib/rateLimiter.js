// Rate limiter simples em memória
// Funciona apenas em ambiente de servidor único (não distribribuído)
// Para produção real com múltiplas instâncias, use Redis (Upstash)

const requestCounts = new Map();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const MAX_REQUESTS = 5; // máximo de tentativas por janela

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