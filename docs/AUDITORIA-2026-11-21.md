# Auditoria Técnica — HelpFlow · 21/11/2026

> **Baseline:** `main` @ `9825c10` (PRs #88 a #98 mergeados após o encerramento da auditoria anterior em `2c64dd1`).
> **Escopo:** código de `src/`, `prisma/`, `cypress/`, CI, configuração e documentação viva.
> **Validação executada:** `npm run lint` exit 0 · `npm run test:run` 18 arquivos / 224 testes ✅ · `npm run build` **não executado** (aplicaria migrations no banco de `DATABASE_URL`).
> **Atualização (22/11/2026):** após o PR #104 — `main` @ `2c73585`; `npx prisma generate` ✅ · lint ✅ · 22 arquivos / 272 testes ✅ · build ✅ · Cypress 42/42 ✅. `AUD-35` a `AUD-40` concluídos (PRs #99, #100, #101, #102 e #104; documentação no #103); `AUD-44` concluído no #105 (aguardando merge); `AUD-41` a `AUD-43`, `AUD-45` e `AUD-46` seguem pendentes.
> **Atualização (23/11/2026):** `main` @ `0f95f98` (PR #108). **Backlog encerrado — nenhum item em aberto.** `AUD-35` a `AUD-46` concluídos. `AUD-45` encerrado por **decisão** (mantém `Report-Only`, sem mudança de código) e `AUD-46` por **decisão** (este relatório passa a ser versionado como a fonte viva). `AUD-37` já estava implementado e mergeado (PR #100, `14e27cf`); o fechamento apenas registra isso.
> **IDs:** `AUD-35` em diante (não renumera itens anteriores).

---

## Resumo

| Severidade | Qtde | IDs |
|---|---|---|
| P1 — bug funcional | 2 | AUD-35, AUD-36 |
| P2 — segurança / integridade | 3 | AUD-37, AUD-38, AUD-39 |
| P3 — consistência / manutenção | 7 | AUD-40 a AUD-46 |

> **Escopo deste registro:** itens já corrigidos ou decididos, com o resultado de cada um. Os detalhes de reprodução que descreviam como explorar uma falha foram removidos — o histórico de cada correção está no PR citado em cada item.

Nenhum problema crítico de isolamento multiempresa foi encontrado: a camada de autorização (`ticketAuthorization.js`) e as filtragens Prisma nas rotas continuam coerentes e fail-closed.

---

## P1 — Bugs funcionais

### [x] AUD-35 · 409 do update otimista acusa conflito em ações que não alteram o chamado

- **Severidade:** P1
- **Área:** componentes de edição do chamado (`TicketList`, `EditTicketForm`) e `PATCH /api/tickets/[id]`.
- **Situação:** todo `PATCH` executava o update no banco, e `Ticket.updatedAt` é `@updatedAt` — um envio sem nenhuma alteração real incrementava o timestamp e fazia outro usuário com a tela aberta receber 409 de conflito falso.
- **Impacto:** conflito falso frequente na edição concorrente, com o chamado travado até recarregar.
- **Correção:** detecção de mudança real na API (branch `fix/aud-35-36`). `src/lib/ticketChanges.js` (`hasTicketChanges`) compara conteúdo e campos derivados; `PATCH /api/tickets/[id]` responde 200 com o estado atual sem gravar quando nada muda.
- **Validação:** `ticketChanges.test.js` (7) e cenário novo em `concurrency.cy.js`; prisma generate ✅ · lint ✅ · 231 testes ✅ · build ✅ · Cypress `concurrency` 7/7 ✅.

### [x] AUD-36 · CLIENT em chamado fechado vê o campo de comentário, que a API só recusa depois do envio

- **Severidade:** P1
- **Área:** `CommentsSection` no detalhe do chamado.
- **Situação:** o formulário de comentário era renderizado para qualquer sessão autenticada, inclusive para o `CLIENT` de um chamado `CLOSED`, cuja regra de domínio é recusar comentário (`AGENTS.md` §8). O usuário escrevia a mensagem e só descobria a recusa no envio, com 403.
- **Impacto:** trabalho perdido e mensagem de erro tardia, sem paridade com o restante da UI.
- **Correção:** `CommentsSection` passou a usar `canCommentOnTicket` (branch `fix/aud-35-36`) e troca o formulário pelo aviso `[data-cy="ticket-comment-closed"]`.
- **Validação:** a spec cobre o CLIENT em `CLOSED` com fechamento fora da API via `cy.task("closeTicket")` (`cypress.config.js`); AGENT mantém o campo (regra inalterada, já coberta em `ticketAuthorization.test.js`). Lint ✅ · 231 testes ✅ · build ✅ · Cypress `comments` 5/5 ✅.

---

## P2 — Segurança e integridade

### [x] AUD-37 · Cadastro de funcionário por código de empresa permite entrada em qualquer tenant

- **Severidade:** P2
- **Área:** cadastro por código de empresa (`src/app/api/register/route.js`) e painel do AGENT em `/dashboard`.
- **Situação:** conhecer o código de convite da empresa bastava para a conta criada por ele entrar no tenant, sem confirmação do dono da empresa. Como o código circula como link de convite, ele não é prova de que a pessoa foi convidada.
- **Impacto:** entrada indevida em tenants alheios, quebrando o modelo de confiança do tenant.
- **Decisão:** **aprovação do AGENT** + **login bloqueado enquanto pendente** (PR #100, `main` @ `14e27cf`).
- **Resultado:** `User.approvalStatus` (`PENDING` | `ACTIVE` | `REJECTED`, default `ACTIVE`, migration `20261121120000_add_user_approval_status`); cadastro por `companyCode` nasce `PENDING`; `authorize` recusa `PENDING`/`REJECTED` com mensagem própria e o callback `jwt` revoga a sessão de conta `REJECTED`. Rotas `GET /api/agents/pending` e `PATCH /api/agents/pending/[id]` (só AGENT da mesma empresa, com `getApprovalDenial`); card "Aguardando aprovação" em `/dashboard`; `GET /api/agents` só lista `ACTIVE`. Regras puras em `src/lib/approval.js` com `approval.test.js` (14). Rate limit ganhou bypass de `register:`/`login:` só fora de produção e com `CYPRESS_TEST_SECRET` (E2E).
- **Validação:** prisma generate ✅ · lint ✅ · 248 testes ✅ · build ✅ · Cypress `approvals` 3/3 ✅.

### [x] AUD-38 · `authorize` conta a tentativa de login **antes** de validar a senha, permitindo bloquear contas alheias

- **Severidade:** P2
- **Área:** `src/lib/auth.js` e `src/lib/rateLimiter.js`.
- **Situação:** o contador de tentativas de login era incrementado antes da validação da senha, o que permitia esgotar a cota de um e-mail conhecido e impedir o login legítimo daquele usuário por uma janela de tempo.
- **Impacto:** negação de serviço contra uma conta específica, contornando a recuperação de senha.
- **Correção:** limites separados por e-mail e por IP, com reset no login aceito (PR #101, `main` @ `c13f1c8`).
- **Resultado:** chaves de limite em `src/lib/loginRateLimit.js`, com cotas distintas por e-mail e por IP; `authorize` normaliza o `req` (NextRequest no `next dev`, objeto simples em produção) e zera os dois contadores no login aceito (`resetRateLimits`). Testes dos limites e do reset em `loginRateLimit.test.js` (8) e `rateLimiter.test.js`.
- **Validação:** lint ✅ · 258 testes ✅ · build ✅ · Cypress 36/36 ✅.

### [x] AUD-39 · `GET /api/health` executa uma consulta CRUD sem timeout anunciando o estado do banco

- **Severidade:** P2 (observabilidade + superfície)
- **Arquivos:** `src/app/api/health/route.js`
- **Situação:** o health check usava `prisma.user.findFirst()` em vez de um `SELECT 1` e não tinha prazo explícito: um banco lento bloqueava a rota por todo o timeout padrão do Prisma, e o endpoint é público. O corpo de erro já suprimia o detalhe, então o problema era só o custo/latência e a dependência de uma tabela de negócio.
- **Impacto:** health check lento e acoplado a uma tabela de negócio.
- **Correção:** `SELECT 1` com prazo curto (PR #102, `main` @ `3685b26`) — `src/lib/healthCheck.js` com `withTimeout`/`checkDatabase` (prazo de 3 s) e `src/app/api/health/route.js` com `dynamic = "force-dynamic"` e `maxDuration = 5`, respondendo 200/503.
- **Validação:** `healthCheck.test.js` (9) · lint ✅ · 267 testes ✅ · build ✅ · `/api/health` 200 ✅.

---

## P3 — Consistência, robustez e manutenção

### [x] AUD-40 · `registerCompanySchema`/`registerEmployeeSchema` exigem `accountType`, mas a rota deriva o tipo antes de validar

- **Severidade:** P3
- **Área:** `src/app/api/register/route.js` e `src/lib/schemas.js`.
- **Situação:** a rota deduzia o tipo de conta pelo corpo (`companyName` → `COMPANY`, senão `EMPLOYEE`) antes de validar. Um corpo misturando os dois fluxos caía no schema do outro e recebia erro de chave não reconhecida, em vez de uma mensagem de conflito: funcionava como defesa, mas tornava a API difícil de prever (ver também AUD-41).
- **Correção:** `accountType` explícito e validado (PR #104, `main` @ `2c73585`) — `registerAccountTypeSchema` (`src/lib/schemas.js`) aceita só `COMPANY`/`EMPLOYEE` (outro valor → 400 `errors.accountType`); `registerCompanySchema`/`registerEmployeeSchema` passam a exigir o literal. A dedução por `companyName`/`companyCode` saiu da rota; campo de vínculo do outro fluxo responde `O campo <x> não combina com accountType: <tipo>` no topo e no erro de campo. `registerSchema` (Fluxo 3) recusa `accountType`/`companyName`/`companyCode` com mensagem dedicada.
- **Validação:** +5 em `schemas.test.js` (272) e a spec `register-contract.cy.js` (6) · lint ✅ · 272 testes ✅ · build ✅ · Cypress 42/42 ✅.

### [x] AUD-41 · API de cadastro mista (COMPANY/EMPLOYEE/legado) sem deprecação do fluxo 3

- **Severidade:** P3
- **Área:** `src/app/api/register/route.js` e `src/lib/registrationRole.js`.
- **Situação:** o "Fluxo 3" cria usuário sem empresa, com a role controlada por `x-test-secret`; o `AGENTS.md` não deixava claro que, em produção, esse fluxo é público e sempre resulta em `CLIENT` sem `companyId`. Só `resolveRegistrationRole` tinha teste.
- **Correção:** o `AGENTS.md` §9 passou a documentar o Fluxo 3 como caminho de compatibilidade com as suítes de teste, legado e sem novas funcionalidades; a rota ganhou a spec `register-contract.cy.js`.
- **Validação:** coberto pela spec `register-contract` (6 cenários).

### [x] AUD-42 · Notificação `ASSIGNED` sobrevive à reatribuição e leva o CLIENT retirado a um 403

- **Severidade:** P3
- **Área:** notificações do sino e `GET /api/notifications`.
- **Situação:** ao reatribuir um chamado, a notificação antiga do responsável anterior continuava no sino com o link "Abrir chamado", que passava a responder 403.
- **Correção:** nota de commit `a9c135e` (PR #106) — o `GET /api/notifications` omite notificações cujo chamado o usuário não pode mais abrir, pela regra de `canViewTicket` (`src/lib/notificationAccess.js`); o limite de 30 é aplicado depois do filtro.
- **Validação:** `notificationAccess.test.js` e `notifications-states.cy.js` (3 cenários), mais o contrato coberto em `api-coverage.cy.js`.

> **Nota:** duas hipóteses foram descartadas durante a verificação — (a) que o `CLIENT` designado não conseguiria abrir o chamado (ele consegue: `canViewTicket` lê `agentId` do banco); (b) que `firstResponseAt` só fosse gravado pelo formulário (o servidor grava em qualquer `PATCH` de AGENT, inclusive nas ações rápidas — `ticket/[id]/route.js:214-218`).

### [x] AUD-43 · Nenhuma cobertura de testes para Route Handlers e componentes

> **Status:** concluído e mergeado — PR #107 (`a72ac55`), branch `test/aud-43-cobertura-rotas`. Commits `d808e20` (spec + `take: 30`), `a5118a2` (specs dentro das cotas de produção) e `1f3bfeb` (espera da busca no dashboard).
> **Cotas de produção:** o CI roda `next start` (`NODE_ENV=production`), onde `isTestBypass` do `src/lib/rateLimiter.js` sempre devolve `false` — a suíte inteira nunca teve o bypass. `api-coverage.cy.js` passou a usar uma conta por cenário que grava chamados (10 criações/15 min) e o cenário da janela de 30 gera 35 avisos por STATUS + ASSIGNED + COMMENT; `registerEmployee` agora envia `x-forwarded-for` único (`register:<ip>` = 5/15 min). **Gatilho:** nenhum outro spec tem orçamento de cota documentado — um spec novo que grave mais de 10 chamados com a mesma conta falha no CI.
> **Cobertura:** `cypress/e2e/api-coverage.cy.js` (12 cenários) — paginação/filtros/busca/ordenação e KPIs de `GET /api/tickets`; "marcar todas como lidas" de `PATCH /api/notifications` inclusive fora da janela de 30; 409 com o corpo `current` e ausência de gravação da alteração recusada. O 409 falso do AUD-35 já está coberto em `src/lib/__tests__/ticketChanges.test.js`.
> **Defeito encontrado no caminho:** a AUD-42 removeu o `take: 30` de `GET /api/notifications`; restaurado aplicando o limite depois do filtro de acessibilidade.
> **Validação:** `npx prisma generate` ✅ · lint ✅ · 23 arquivos / 283 testes ✅ · build ✅ · Cypress 55/55 ✅.

- **Severidade:** P3
- **Área:** `src/lib/__tests__/` (18 arquivos na baseline) e `cypress/e2e/` (7 specs na baseline).
- **Situação:** o `AGENTS.md` §10 declara como política consciente só testar funções puras, mas o efeito era que várias regressões só eram detectáveis via E2E (lento, banco real): paginação e filtros da lista, marcação de todas as notificações como lidas, reconciliação de estado após 409 e o 409 falso do AUD-35, que não tinha teste algum.
- **Correção:** `cypress/e2e/api-coverage.cy.js` (12 cenários) cobre o contrato de `GET /api/tickets` (paginação, filtros, busca, ordenação e KPIs), "marcar todas como lidas" de `PATCH /api/notifications` (inclusive fora da janela de 30) e o 409 com o corpo `current`, sem gravar a alteração recusada. O 409 falso do AUD-35 fica em `ticketChanges.test.js`. Ver o bloco de status no topo deste item.

### [x] AUD-44 · Estado técnico dessincronizado e lacunas de documentação viva

- **Severidade:** P3
- **Área:** `ESTADO_ATUAL.md`, `AGENTS.md` e `src/lib/__tests__/docsConsistency.test.js`.
- **Situação:** o estado técnico documentado estava desatualizado em relação à `main`:
  1. `ESTADO_ATUAL.md` citava commit, contagens de testes e de cenários antigos. O guard `docsConsistency.test.js` validava `README.md` e `AGENTS.md`, mas não `ESTADO_ATUAL.md`.
  2. A árvore do §3 do `AGENTS.md` não listava `ticketConcurrency.js` nem o próprio guard.
  3. O `docs/AUDITORIA.md` antigo (não versionado — ver AUD-46) se declarava encerrado com PRs já mergeados depois da baseline; este relatório repõe os IDs a partir de `AUD-35`.
  4. Um cabeçalho de UI do `/dashboard` trazia emoji. A regra §13.2 ("sem emojis nos cabeçalhos") é escrita para PRs; se vale também para a UI, documentar e remover.
- **Correção:** PR [#105](https://github.com/tharciosantos/helpflow/pull/105), branch `fix/aud-44-docs-sincronizadas`, commit `6493672` — `ESTADO_ATUAL.md` atualizado; o guard passou a validar `ESTADO_ATUAL.md` (cabeçalho e "Onde estamos"; commit e branches ficam fora de propósito para não ficar frágil); árvore do §3 completada; emoji removido do cabeçalho "Dica rápida" em `/dashboard`.
- **Validação:** prisma generate ✅ · lint ✅ · 22 arquivos / 273 testes ✅ · build ✅. Cypress não reexecutado (o PR só toca docs, guard e texto de UI).
- **Fora do escopo:** outros emojis de texto de ajuda em `register/page.jsx` (🏢 e 👤) permaneceram.

### [x] AUD-45 · `next.config.mjs` expõe apenas CSP em modo *Report-Only*

- **Severidade:** P3
- **Área:** `next.config.mjs`.
- **Situação:** a política CSP está em `Content-Security-Policy-Report-Only`, ou seja, **não bloqueia nada** — o cabeçalho está desenhado, mas não protege, e não há `report-uri`/`report-to`, então nenhuma violação é observada.
- **Decisão (23/11/2026):** manter **`Report-Only`**, sem trocar para enforcement e sem alterar `next.config.mjs`. A decisão é consciente e fica registrada aqui; nenhum arquivo versionado mudou.
  - **Por que enforcement não está pronto:** a política atual depende de `'unsafe-inline'` em `script-src` e `style-src`, e é isso que a segura. O app injeta scripts inline no SSR (`self.__next_f.push` do RSC e o `ThemeInitScript` de `src/app/components/ThemeInitScript.jsx`) e usa `style` inline em `NotificationBell`, `MobileHeader`, `FeatureCard` e no `next/image` (`color:transparent`). Tirar o `'unsafe-inline'` sem antes mover para `nonce`/`hash` quebraria a hidratação; com o `'unsafe-inline'` presente, o enforcement protegeria quase nada além do que `X-Frame-Options`, `base-uri`, `form-action` e `object-src` já cobrem.
  - **Nonce não é trivial aqui:** `src/middleware.js` hoje é só `withAuth` (matcher em `/dashboard/:path*` e `/ticket/:path*`), sem geração de nonce nem cobertura de todas as rotas. Migrar exige gerar o nonce no middleware, propagá-lo ao `<script>` e ao `script-src`, e ampliar o matcher — um trabalho próprio, não uma troca de constante.
  - **O que foi verificado no caminho:** o app não carrega nenhum recurso de origem externa (login e landing: 12–15 recursos, todos da própria origem); as fontes são `next/font` self-hosted; a única origem externa é `avatars.githubusercontent.com`, já liberada em `img-src`. Isso confirma que a política **está** alinhada com o que o app carrega hoje.
  - **Consequência aceita:** a CSP não bloqueia nada em produção e nenhuma violação é observada. Se um dia entrar script de terceiro, a política não o detém. O teste de enforcement em modo real chegou a ser montado e foi interrompido; não foi medido se a política atual gera violações sob enforcement.
  - **Gatilho para reabrir:** incluir qualquer origem externa em `script-src`/`connect-src` (analytics, Sentry, CDN) ou adotar nonce no middleware. Nesse momento a troca para `Content-Security-Policy` volta à mesa com os dados que este item levantou.

### [x] AUD-46 · `docs/AUDITORIA.md` fora do versionamento e sem caminho de continuidade

- **Severidade:** P3
- **Área:** `.git/info/exclude` e `AGENTS.md` §1.1.
- **Situação:** o `docs/AUDITORIA.md` está em `.git/info/exclude` (exclusão **local**, não commitada nem propagada a outros clones), enquanto o `AGENTS.md` o trata como "fonte viva" de um backlog com IDs estáveis. Em qualquer clone novo — ou no CI — o arquivo não existe, e a regra "toda correção `AUD-xx` deve atualizar o backlog" não é verificável. A exclusão local também não é sincronizada entre máquinas do próprio mantenedor.
- **Decisão (23/11/2026):** versionar **este relatório** como a fonte viva do backlog, em vez do `docs/AUDITORIA.md` antigo ou de issues do GitHub. O `docs/AUDITORIA.md` continua excluído localmente, como **histórico encerrado** (AUD-01 a AUD-33, `main` @ `2c64dd1`), e não recebe novos itens.
  - **Por que este e não o antigo:** o `AUDITORIA.md` é de outra auditoria (36 itens, todos fechados, baseline `dfe9d90`); fundir os dois reescreveria IDs estáveis e um histórico que ninguém consulta. Este relatório tem os IDs de `AUD-35` em diante, o estado atual e os registros de decisão.
  - **O que muda:** o `AGENTS.md` §1.1 passa a apontar `docs/AUDITORIA-2026-11-21.md` como backlog versionado, e a regra "toda correção `AUD-xx` atualiza o backlog" passa a ser verificável em qualquer clone e no CI. O arquivo é commitado normalmente (não está no `.git/info/exclude`).
  - **O que não muda:** o `docs/AUDITORIA.md` segue fora do versionamento; a exclusão em `.git/info/exclude` permanece como registro local do histórico.
  - **Guard:** o guard `docsConsistency.test.js` só verifica a **data de atualização** deste relatório, não as contagens — ele é um relatório com números históricos por fase, e exigir a contagem atual faria o teste falhar a cada nova revisão.

---

## Pontos fortes confirmados

- Autorização centralizada e testada (`ticketAuthorization.js`), fail-closed, com isolamento por `companyId` nas consultas Prisma das rotas.
- Revogação de sessão por `tokenVersion` com validação a cada requisição; e-mail normalizeado; reset de senha atômico (`updateMany` com `used: false`).
- Update otimista **no banco** (`where` com `updatedAt`) — a parte difícil está correta; o defeito é só o falso conflito do AUD-35.
- Cron autenticado com `timingSafeEqual` e fail-closed; rate limit distribuído com fallback em memória.
- CI com job E2E contra Postgres efêmero; guard `docsConsistency.test.js` impedindo drift das contagens no README.
- Headers de segurança (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`) presentes.

## Itens para reabrir

O backlog está encerrado. Os únicos gatilhos previstos são os registrados nos itens de decisão:

- **AUD-45** — incluir qualquer origem externa em `script-src`/`connect-src` (analytics, Sentry, CDN) ou adotar nonce no middleware.
- **AUD-43** — um spec novo que grave mais de 10 chamados com a mesma conta falha no CI: cada cenário que grava precisa de conta própria ou de orçamento de cota documentado.
