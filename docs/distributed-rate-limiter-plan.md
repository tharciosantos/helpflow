# Plano: Rate Limiter Distribuído com Upstash Redis

## Estado Atual

O rate limiter está implementado em `src/lib/rateLimiter.js` usando um `Map` em memória. A interface pública é:

```js
checkRateLimit(identifier, options?) → { isLimited, remaining, resetTime }
getClientIp(req) → string
```

Dependências já instaladas (sem uso no código):
- `@upstash/ratelimit` (^2.0.8)
- `@upstash/redis` (^1.38.0)

## Rotas Protegidas

| Rota                | Método | Chave                     | Limite      | Identificador |
| ------------------- | ------ | ------------------------- | ----------- | ------------- |
| `/api/register`     | POST   | `register:${ip}`          | 5 / 15 min  | IP            |
| `/api/auth` (login) | POST   | `login:${email}`          | 5 / 15 min  | Email         |
| `/api/tickets`      | POST   | `ticket:create:${userId}` | 10 / 15 min | User ID       |
| `/api/tickets/[id]` | PATCH  | `ticket:update:${userId}` | 30 / 15 min | User ID       |
| `/api/tickets/[id]` | DELETE | `ticket:delete:${userId}` | 10 / 15 min | User ID       |

## Problema com Serverless

Em ambiente Vercel (serverless), cada instância de execução mantém seu próprio `Map`. Com múltiplas instâncias simultâneas:

- 3 instâncias × 5 requests = 15 requests antes de bloqueio efetivo
- Estado não persiste entre cold starts
- Rate limiting perde efetividade

## Por que Upstash Redis

- Serverless-native e adequado para baixa latência
- Plano free: 10k comandos/dia
- Dependências já instaladas no projeto
- Sem infraestrutura para gerenciar

## Arquitetura Recomendada

```
src/lib/rateLimiter.js
    │
    ├── Se UPSTASH_REDIS_REST_URL definido
    │       └── Usa @upstash/ratelimit (sliding window)
    │
    └── Se não definido
            └── Usa Map em memória (fallback)
```

A interface `checkRateLimit(identifier, options)` não muda. As rotas não precisam saber qual backend está ativo.

### Decisão Pendente: Comportamento em Falha

Quando o Upstash falha (timeout, erro de conexão), o sistema deve:

| Opção           | Comportamento                                | Risco                                   |
| --------------- | -------------------------------------------- | --------------------------------------- |
| **fail-open**   | Permitir requisições via fallback em memória | requests passam sem limite distribuído  |
| **fail-closed** | Bloquear ou retornar erro 503                | Usuários legítimos podem ser bloqueados |

**Recomendação:** fail-open com log de alerta. Um rate limiter que bloqueia usuários legítimos é pior que um que falha abrindo.

### Múltiplos Limiters

Como os limites variam por ação (5, 10, 30), a implementação Upstash pode precisar de:

1. **Uma instância por configuração** — criar 3 `Ratelimit` (slidingWindow) com limites diferentes
2. **Cache interno** — mapear prefixo de chave para configuração

Exemplo de prefixos:
- `rl:reg:` → 5 req / 15 min
- `rl:login:` → 5 req / 15 min
- `rl:ticket:create:` → 10 req / 15 min
- `rl:ticket:update:` → 30 req / 15 min
- `rl:ticket:delete:` → 10 req / 15 min

## Variáveis de Ambiente

```env
# Upstash Redis — OPCIONAL
# Se ausente, rate limiter usa fallback em memória (Map)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Devem ser adicionadas ao `.env.example` com comentário explicando opcionalidade.

## Impacto nos Testes

| Teste                            | Impacto                          |
| -------------------------------- | -------------------------------- |
| `rateLimiter.test.js` (8 testes) | Nenhum — testa via fallback Map  |
| Cypress (14 testes)              | Nenhum — roda em dev sem Upstash |
| `npm run build`                  | Nenhum — não muda estrutura      |

Em ambientes sem variáveis Upstash, o comportamento é idêntico ao atual.

## Riscos

| Risco                | Severidade | Mitigação                                                              |
| -------------------- | ---------- | ---------------------------------------------------------------------- |
| Upstash fora do ar   | Baixa      | Definir explicitamente fail-open ou fail-closed antes da implementação |
| Chave API expirada   | Baixa      | Logs + fallback                                                        |
| Aumento latência     | Baixa      | Aumento de latência geralmente baixo                                   |
| Custo                | Baixa      | Plano free: 10k comandos/dia                                           |
| Acoplamento provider | Média      | Adapter pattern isola lógica                                           |

## Plano de Implementação

### Task 1: Adaptador Upstash

**Escopo:** Modificar `src/lib/rateLimiter.js`
**Não altera:** rotas, testes, schema, package.json

1. Detectar `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`
2. Se presentes: criar instância `Ratelimit` com `slidingWindow`
3. Se ausentes: manter Map em memória
4. Manter interface `checkRateLimit(identifier, options)` inalterada
5. Definir comportamento em falha (fail-open recomendado)

### Task 2: Variáveis de Ambiente

**Escopo:** Atualizar `.env.example`
**Não altera:** código, rotas, testes

1. Adicionar `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`
2. Documentar que são opcionais

### Task 3: Testes do Adaptador

**Escopo:** Criar/atualizar testes em `src/lib/__tests__/rateLimiter.test.js`
**Não altera:** código de produção, rotas

1. Mock do Upstash Redis
2. Testar fallback quando variáveis ausentes
3. Testar integração quando variáveis presentes
4. Testar comportamento em falha do Upstash

### Task 4: Documentação no README

**Escopo:** Atualizar `README.md`
**Não altera:** código, testes

1. Mencionar rate limiter distribuído em produção
2. Documentar variáveis necessárias
3. Explicar fallback em dev/testes

## Branch Sugerida

```
feat/distributed-rate-limiter
```

## Commit Sugerido

```
feat: migrar rate limiter para Upstash Redis com fallback em memória
```
