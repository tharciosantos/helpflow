import { timingSafeEqual } from 'crypto';

/**
 * Valida o header Authorization das rotas de cron (Vercel Cron).
 *
 * Falha fechada: sem `CRON_SECRET` configurado, nenhuma requisição é
 * autorizada. Isso evita que a comparação vire `Bearer undefined` e aceite
 * qualquer chamada nesse formato.
 *
 * @param {{ authHeader: string|null, secret: string|undefined }} input
 * @returns {boolean}
 */
export function isCronAuthorized({ authHeader, secret }) {
  if (!secret || !authHeader) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const provided = Buffer.from(authHeader);

  // timingSafeEqual exige buffers de mesmo tamanho.
  if (provided.length !== expected.length) return false;

  return timingSafeEqual(provided, expected);
}
