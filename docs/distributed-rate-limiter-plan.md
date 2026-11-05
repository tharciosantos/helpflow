# Rate Limiter Distribuído com Upstash Redis

> **Status: implementado.** Este documento descreve o comportamento atual de
> `src/lib/rateLimiter.js`. O plano original (adaptador Upstash + fallback em
> memória) foi entregue; mantemos aqui a arquitetura e os limites vigentes.

## Estado Atual

O rate limiter vive em `src/lib/rateLimiter.js` com dois backends e a mesma interface:

```js
checkRateLimit(identifier, options?) → { isLimited, remaining, resetTime }
getClientIp(req) → string
buildRateLimitHeaders({ remaining, resetTime }) → { X-RateLimit-Remaining, Retry-After }
```

- **Upstash (distribuído):** usado quando `UPSTASH_REDIS_REST_URL` e
  `UPSTASH_REDIS_REST_TOKEN` estão definidos. Cria uma instância
  `Ratelimit` (`slidingWindow`) por combinação de janela/limite, com prefixo
  `helpflow:ratelimit` e analytics habilitado.
- **Fallback em memória:** `Map` com janela deslizante, usado quando as
  variáveis não estão definidas (dev/instância única) ou quando o Upstash
  falha (**fail-open**, com log de erro — um rate limiter que bloqueia
  usuários legítimos é pior que um que falha abrindo).

Em produção sem as variáveis Upstash, a aplicação loga um aviso e segue com o
fallback em memória (não distribuído).

## Rotas Protegidas

| Rota | Método | Chave | Limite | Identificador |
| ------------------- | ------ | -------------------------------- | ----------- | ------------- |
| `/api/register` | POST | `register:${ip}` | 5 / 15 min | IP |
| `/api/auth/[...nextauth]` (login) | POST | `login:${email}` — aplicado no `authorize` de `src/lib/auth.js` | 5 / 15 min | E-mail |
| `/api/auth/forgot-password` | POST | `forgot-password:${ip}` | 5 / 15 min | IP |
| `/api/auth/forgot-password` | POST | `forgot-password:email:${email}` | 3 / 15 min | E-mail |
| `/api/tickets` | POST | `ticket:create:${userId}` | 10 / 15 min | User ID |
| `/api/tickets/[id]` | PATCH | `ticket:update:${userId}` | 30 / 15 min | User ID |
| `/api/tickets/[id]` | DELETE | `ticket:delete:${userId}` | 10 / 15 min | User ID |
| `/api/tickets/[id]/comments` | POST | `comment:create:${userId}` | 20 / 15 min | User ID |

## Por que Upstash Redis

- Serverless-native e adequado para baixa latência
- Plano free: 10k comandos/dia
- Dependências já instaladas no projeto (`@upstash/ratelimit`, `@upstash/redis`)
- Sem infraestrutura para gerenciar

## Problema que Resolve (Serverless)

Em ambiente Vercel, cada instância mantém seu próprio `Map`. Com múltiplas
instâncias simultâneas:

- 3 instâncias × 5 requests = 15 requests antes de bloqueio efetivo
- Estado não persiste entre cold starts
- Rate limiting perde efetividade

O backend Upstash centraliza o contador no Redis, eliminando o problema.

## Variáveis de Ambiente

```env
# Upstash Redis — rate limiting distribuído (obrigatório em produção/Vercel)
# Se ausente, a app usa fallback em memória (apenas dev / instância única)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Já presentes em `.env.example`.

## Cobertura de Testes

- `src/lib/__tests__/rateLimiter.test.js` — exercita o fallback em memória, o
  parsing de IP e o comportamento da interface pública.
- Cypress roda em dev sem Upstash, com comportamento idêntico ao fallback.

## Riscos Vigilados

| Risco | Severidade | Mitigação |
| ------------------- | ---------- | ---------------------------------------- |
| Upstash fora do ar | Baixa | Fail-open: fallback em memória + log de erro |
| Chave API expirada | Baixa | Logs + fallback |
| Aumento de latência | Baixa | Latência do Redis REST costuma ser baixa |
| Custo | Baixa | Plano free: 10k comandos/dia |
| Instâncias sem Redis | Média | Aviso em produção quando o fallback estiver ativo |

