# Auditoria Técnica — HelpFlow · 21/11/2026

> **Baseline:** `main` @ `9825c10` (PRs #88 a #98 mergeados após o encerramento da auditoria anterior em `2c64dd1`).
> **Escopo:** código de `src/`, `prisma/`, `cypress/`, CI, configuração e documentação viva.
> **Validação executada:** `npm run lint` exit 0 · `npm run test:run` 18 arquivos / 224 testes ✅ · `npm run build` **não executado** (aplicaria migrations no banco de `DATABASE_URL`).
> **Atualização (22/11/2026):** após o PR #104 — `main` @ `2c73585`; `npx prisma generate` ✅ · lint ✅ · 22 arquivos / 272 testes ✅ · build ✅ · Cypress 42/42 ✅. `AUD-35` a `AUD-40` concluídos (PRs #99, #100, #101, #102 e #104; documentação no #103); `AUD-44` concluído no #105 (aguardando merge); `AUD-41` a `AUD-43`, `AUD-45` e `AUD-46` seguem pendentes.
> **Atualização (23/11/2026):** `main` @ `a72ac55` (PR #107). `AUD-41`, `AUD-42`, `AUD-43`, `AUD-44`, `AUD-45` e `AUD-46` concluídos; `AUD-45` encerrado por **decisão** (mantém `Report-Only`, sem mudança de código) e `AUD-46` por **decisão** (este relatório passa a ser versionado como a fonte viva). Segue em aberto: `AUD-37` (decisão de produto).
> **IDs:** `AUD-35` em diante (não renumera itens anteriores).

---

## Resumo

| Severidade | Qtde | IDs |
|---|---|---|
| P1 — bug funcional | 2 | AUD-35, AUD-36 |
| P2 — segurança / integridade | 3 | AUD-37, AUD-38, AUD-39 |
| P3 — consistência / manutenção | 7 | AUD-40 a AUD-46 |

Nenhum problema crítico de isolamento multiempresa foi encontrado: a camada de autorização (`ticketAuthorization.js`) e as filtragens Prisma nas rotas continuam coerentes e fail-closed.

---

## P1 — Bugs funcionais

### [x] AUD-35 · 409 do update otimista acusa conflito em ações que não alteram o chamado

- **Severidade:** P1
- **Arquivos:** `src/app/components/TicketList.jsx:96-124`, `src/app/components/EditTicketForm.jsx:78-133`
- **Problema:** `PATCH` sempre executa `ticket.update`, e `Ticket.updatedAt` é `@updatedAt` no Prisma — **todo** UPDATE incrementa o timestamp, mesmo sem mudança de campo. Basta um PATCH com dados idênticos (agente reescolhe o mesmo status no select da lista, clica "Salvar Alterações Rápidas" sem mudar nada, ou o formulário completo reenvia title/description/status iguais) para que quem tem a tela aberta receba **409 "alterado por outra pessoa"** sem que ninguém tenha alterado nada. No formulário de edição não há como reenviar: só resta "Recarregar chamado".
- **Reprodução:** com um único agente, abra `/ticket/[id]` em duas abas, salve na aba A sem mudar valor, salve na aba B → 409 falso.
- **Correção sugerida:** montar o `data` apenas com campos cujo valor difere do `ticket` atual; se o `data` resultante estiver vazio, responder 200 com o ticket atual sem `update` (ou um 204 "nada a fazer"). Alternativa: só incrementar `updatedAt` quando `buildHistoryEntries(...).length > 0 || data.firstResponseAt || data.resolvedAt`. O recálculo de primeira resposta já evita o caso vazio — o problema é o `update` incondicional.
- **Teste:** cobrir no Cypress `concurrency.cy.js`: dois PATCH iguais sequenciais com o mesmo `expectedUpdatedAt` devem retornar 200, não 409.
- **Status:** concluído em 21/11/2026 — branch `fix/aud-35-36`. `src/lib/ticketChanges.js` (`hasTicketChanges`) compara conteúdo e campos derivados; `PATCH /api/tickets/[id]` responde 200 com o estado atual sem gravar quando nada muda. Testes: `ticketChanges.test.js` (7) e cenário novo em `concurrency.cy.js`. Validação: prisma generate ✅ · lint ✅ · 231 testes ✅ · build ✅ · Cypress `concurrency` 7/7 ✅.

### [x] AUD-36 · CLIENT em chamado fechado vê o campo de comentário, que a API só recusa depois do envio

- **Severidade:** P1
- **Arquivos:** `src/app/components/CommentsSection.jsx:5-21,239-308`
- **Problema:** `CommentsSection` recebe `ticket` e `session` e já usa `canDeleteComment`, mas **não** usa `canCommentOnTicket`. O `<form>` de comentário é renderizado para qualquer sessão autenticada, inclusive para o `CLIENT` de um chamado `CLOSED` — regra de domínio explícita em `AGENTS.md` §8 (follow-up deve virar novo chamado). O usuário escreve a mensagem e só descobre a recusa no envio, com **403**; o contador de caracteres, o botão "Enviar Mensagem" e o atalho Ctrl+Enter continuam funcionando até lá.
- **Reprodução:** como CLIENT, abra um chamado `CLOSED` em que você é autor ou responsável → o campo de comentário aparece normalmente.
- **Correção sugerida:** importar `canCommentOnTicket(session?.user, ticket)` em `CommentsSection` e, quando `false`, substituir o `<form>` pela mensagem do próprio domínio ("Chamado fechado não aceita novos comentários. Abra um novo chamado."). É a paridade com o tratamento que o detalhe já faz para "Editar" (`canEditTicketContent`) e para as lixeiras (`canDeleteComment`).
- **Teste:** Cypress `comments.cy.js` — CLIENT em `CLOSED` não vê `[data-cy="ticket-comment-input"]` nem `[data-cy="ticket-comment-submit"]`; AGENT continua vendo.
- **Status:** concluído em 21/11/2026 — branch `fix/aud-35-36`. `CommentsSection` usa `canCommentOnTicket` e troca o formulário pelo aviso `[data-cy="ticket-comment-closed"]`; a spec cobre o CLIENT em `CLOSED` com fechamento fora da API via `cy.task("closeTicket")` (`cypress.config.js`). AGENT mantém o campo (regra inalterada, já coberta em `ticketAuthorization.test.js`). Validação: lint ✅ · 231 testes ✅ · build ✅ · Cypress `comments` 5/5 ✅.

---

## P2 — Segurança e integridade

### [x] AUD-37 · Cadastro de funcionário por código de empresa permite entrada em qualquer tenant

- **Severidade:** P2
- **Arquivos:** `src/app/api/register/route.js:56-88`, `src/app/(dashboard)/dashboard/page.js:204-280`
- **Problema:** o código da empresa (`DEMO-2026`, `TECH-4821`, ...) é exibido em destaque no painel do AGENT e compartilhado como "link de convite" (`/register?companyCode=...`). Qualquer pessoa que receba o link — mas também qualquer pessoa que **adivinhe** o código — cria conta `CLIENT` naquele tenant sem confirmação do dono da empresa. Não há convite com expiração, aprovação ou e-mail verificado. O código é 4 caracteres alfabéticos + 4 dígitos (`generateCompanyCode`), gerado com `Math.random()` e validado case-insensitive: ~1,3 milhão de combinações efetivas por prefixo, enumeráveis em massa (o rate-limit é por IP, `5/15min`, e rotacionar IPs basta).
- **Impacto:** entrada em tenants alheios. O intruso não ganha visão do acervo (o `CLIENT` só vê o que cria ou recebe), mas quebra o modelo de confiança do tenant, aparece em `GET /api/agents` (que já expõe e-mails de toda a empresa a qualquer AGENT) e pode virar alvo de notificações; combinado com AUD-38, seus dados de e-mail ficam expostos a ataques de bloqueio de login.
- **Correção sugerida:** trocar o código curto por convite assinado (token aleatório com expiração, gerado pelo AGENT e revogável), ou exigir aprovação do AGENT antes de a conta entrar. Alternativa mínima: aumentar a entropia (código de 12+ caracteres com `crypto.randomBytes`) e rate-limit por código além do IP.
- **Decisão necessária:** é mudança de produto; depende do usuário aceitar alterar o fluxo de convite.
- **Status:** concluído em 21/11/2026 via PR #100 (`main` @ `14e27cf`) — decisão do usuário: **aprovação do AGENT** + **login bloqueado enquanto pendente**. `User.approvalStatus` (`PENDING` | `ACTIVE` | `REJECTED`, default `ACTIVE`, migration `20261121120000_add_user_approval_status`); cadastro por `companyCode` nasce `PENDING`; `authorize` recusa `PENDING`/`REJECTED` com mensagem própria e o callback `jwt` revoga a sessão de conta `REJECTED`. Novas rotas `GET /api/agents/pending` e `PATCH /api/agents/pending/[id]` (só AGENT da mesma empresa, com `getApprovalDenial`); card "Aguardando aprovação" em `/dashboard`; `GET /api/agents` só lista `ACTIVE`. Regras puras em `src/lib/approval.js` com `approval.test.js` (14). Rate limit ganhou bypass de `register:`/`login:` só fora de produção e com `CYPRESS_TEST_SECRET` (E2E). Validação: prisma generate ✅ · lint ✅ · 248 testes ✅ · build ✅ · Cypress `approvals` 3/3 ✅.

### [x] AUD-38 · `authorize` conta a tentativa de login **antes** de validar a senha, permitindo bloquear contas alheias

- **Severidade:** P2
- **Arquivos:** `src/lib/auth.js:30-35`, `src/lib/rateLimiter.js:98-119`
- **Problema:** a chave do rate limit é `login:${email}`, incrementada a cada tentativa **independentemente** de a senha estar correta. Um atacante que conheça o e-mail do alvo (exposto em `GET /api/agents` a qualquer AGENT, e em notificações) faz 6 tentativas erradas e trava o login legítimo por 15 minutos; repetindo a cada 15 min, mantém o alvo fora do sistema indefinidamente. A recuperação de senha usa outra chave (`forgot-password:email:*`), então resetar a senha não fura o bloqueio.
- **Reprodução:** repetir 6× um POST em `/api/auth/callback/credentials` para o e-mail do alvo com uma senha errada; o login correto seguinte recebe "Muitas tentativas de login. Tente novamente em 15 minutos."
- **Correção sugerida:** chavear o limite por `email + IP` (ou por IP e aplicar um limite bem mais frouxo por e-mail), e **resetar** o contador no login bem-sucedido. Registrar o e-mail tentado apenas de forma truncada, se o objetivo é observabilidade.
- **Teste:** Vitest em `rateLimiter`/`auth` puro (extrair a chave para uma função `buildLoginRateLimitKey`) — `x@a.com` com senha certa após bloqueio de outro IP deve passar.
- **Status:** concluído em 21/11/2026 (PR #101, `main` @ `c13f1c8`) — chaves em `src/lib/loginRateLimit.js` (`EMAIL_LOGIN_MAX_ATTEMPTS` 20 por e-mail, 10 por IP `login-ip:<ip>`); `authorize` normaliza o `req` (NextRequest no `next dev`, objeto simples em produção) e zera e-mail+IP no login aceito (`resetRateLimits`). `vite` dos limites e reset em `loginRateLimit.test.js` (8) e `rateLimiter.test.js`. Validação: lint ✅ · 258 testes ✅ · build ✅ · Cypress 36/36 ✅.

### [x] AUD-39 · `GET /api/health` executa uma consulta CRUD sem timeout anunciando o estado do banco

- **Severidade:** P2 (observabilidade + superfície)
- **Arquivos:** `src/app/api/health/route.js`
- **Problema:** o health check usa `prisma.user.findFirst()` (transfere até uma linha) em vez de um `SELECT 1` e não tem `connectionTimeout`/`queryTimeout` explícito. Um banco lento bloqueia a rota por todo o timeout padrão do Prisma (segundos), e o endpoint é público (usado pelo CI, mas fica exposto em produção sem autenticação). O corpo de erro suprime o detalhe (`"Erro interno no health check"`), o que é bom; o problema é só o custo/latência e a dependência de uma tabela de negócio.
- **Correção sugerida:** trocar por `prisma.$queryRaw\`SELECT 1\`` (como o cron) e/ou adicionar `datasource db { ... connectionLimit ... }` e um timeout de consulta; opcionalmente proteger com um token, ou separar `/api/health` (liveness) de `/api/health/db` (readiness).
- **Status:** concluído em 21/11/2026 (PR #102, `main` @ `3685b26`) — `src/lib/healthCheck.js` com `withTimeout`/`checkDatabase` (prazo de 3 s) e `src/app/api/health/route.js` usando `SELECT 1` com `dynamic = "force-dynamic"` e `maxDuration = 5`, respondendo 200/503. Testes em `healthCheck.test.js` (9). Validação: lint ✅ · 267 testes ✅ · build ✅ · `/api/health` 200 ✅.

---

## P3 — Consistência, robustez e manutenção

### [x] AUD-40 · `registerCompanySchema`/`registerEmployeeSchema` exigem `accountType`, mas a rota deriva o tipo antes de validar

- **Severidade:** P3
- **Arquivos:** `src/app/api/register/route.js:24-33`, `src/lib/schemas.js:55-77`
- **Problema:** a rota calcula `accountType = body.accountType || (body.companyName ? 'COMPANY' : ...)`. Se o cliente enviar `companyName` **e** `accountType: 'EMPLOYEE'`, cai no `registerEmployeeSchema`, que faz `.strict()` e rejeita `companyName` com "Unrecognized key". A mensagem ao usuário é de payload inválido, não de conflito. Funciona como defesa, mas a derivação implícita torna a API difícil de prever (ver também AUD-41).
- **Correção sugerida:** exigir `accountType` explícito e remover a derivação por heurística; ou aceitar ambos e validar a coerência com uma mensagem dedicada.
- **Status:** concluído em 22/11/2026 (PR #104, `main` @ `2c73585`) — `registerAccountTypeSchema` (`src/lib/schemas.js`) valida o `accountType` presente no corpo (só `COMPANY`/`EMPLOYEE`; outro valor → 400 `errors.accountType`); `registerCompanySchema`/`registerEmployeeSchema` passam a exigir o literal. A derivação por `companyName`/`companyCode` saiu da rota; campo de vínculo do outro fluxo responde `O campo <x> não combina com accountType: <tipo>` no topo e no erro de campo. `registerSchema` (Fluxo 3) recusa `accountType`/`companyName`/`companyCode` com mensagem dedicada. Testes: +5 em `schemas.test.js` (272) e nova spec `register-contract.cy.js` (6). Validação: lint ✅ · 272 testes ✅ · build ✅ · Cypress 42/42 ✅.

### [ ] AUD-41 · API de cadastro mista (COMPANY/EMPLOYEE/legado) sem deprecação do fluxo 3

- **Severidade:** P3
- **Arquivos:** `src/app/api/register/route.js:127-146`, `src/lib/registrationRole.js`
- **Problema:** o "Fluxo 3" cria usuário sem empresa e com role controlada por `x-test-secret` + `CYPRESS_TEST_SECRET`. Em produção (`NODE_ENV === 'production'`) sempre vira `CLIENT` sem empresa; funciona, mas fica um endpoint público que cria contas órfãs (sem `companyId`) — que caem no escopo pessoal do `canViewTicket`. O `AGENTS.md` §9 menciona o `x-test-secret`, mas não diz que o fluxo sem empresa também é público em produção; só `resolveRegistrationRole` tem teste, não a rota.
- **Correção sugerida:** documentar no `AGENTS.md` §9 que contas standalone existem só para compatibilidade de testes (ou remover o fluxo quando o Cypress migrar para `accountType: 'COMPANY'`).

### [ ] AUD-42 · Notificação `ASSIGNED` sobrevive à reatribuição e leva o CLIENT retirado a um 403

- **Severidade:** P3
- **Arquivos:** `src/lib/notifications.js:45-46`, `src/app/components/NotificationBell.jsx:415-423`, `src/app/api/tickets/[id]/route.js:268-280`
- **Problema:** atribuir é permitido a **qualquer** membro da empresa, inclusive `CLIENT` (delegação). O responsável é notificado e abre o chamado normalmente enquanto `agentId` aponta para ele. Quando o AGENT reatribui a outra pessoa (ou remove o responsável), a notificação antiga continua no sino do CLIENT anterior com o link "Abrir chamado →"; o clique cai em `/ticket/[id]`, que responde **403** ("Não autorizado"). A exclusão do chamado já limpa a notificação pelo `onDelete: Cascade`; a reatribuição não.
- **Correção sugerida:** em `GET /api/notifications`, filtrar por acessibilidade atual do chamado; ou, no sino, não renderizar o link quando a notificação não puder mais ser aberta.
- **Teste:** Cypress `notifications-states.cy.js` — notificação de chamado reatribuído deixa de exibir "Abrir chamado" para o responsável anterior.

> **Nota:** duas hipóteses foram descartadas durante a verificação — (a) que o `CLIENT` designado não conseguiria abrir o chamado (ele consegue: `canViewTicket` lê `agentId` do banco); (b) que `firstResponseAt` só fosse gravado pelo formulário (o servidor grava em qualquer `PATCH` de AGENT, inclusive nas ações rápidas — `ticket/[id]/route.js:214-218`).

### [x] AUD-43 · Nenhuma cobertura de testes para Route Handlers e componentes

> **Status:** concluído e mergeado — PR #107 (`a72ac55`), branch `test/aud-43-cobertura-rotas`. Commits `d808e20` (spec + `take: 30`), `a5118a2` (specs dentro das cotas de produção) e `1f3bfeb` (espera da busca no dashboard).
> **Cotas de produção:** o CI roda `next start` (`NODE_ENV=production`), onde `isTestBypass` do `src/lib/rateLimiter.js` sempre devolve `false` — a suíte inteira nunca teve o bypass. `api-coverage.cy.js` passou a usar uma conta por cenário que grava chamados (10 criações/15 min) e o cenário da janela de 30 gera 35 avisos por STATUS + ASSIGNED + COMMENT; `registerEmployee` agora envia `x-forwarded-for` único (`register:<ip>` = 5/15 min). **Pendência:** nenhum outro spec tem orçamento de cota documentado — um spec novo que grave mais de 10 chamados com a mesma conta falha no CI.
> **Cobertura:** `cypress/e2e/api-coverage.cy.js` (12 cenários) — paginação/filtros/busca/ordenação e KPIs de `GET /api/tickets`; "marcar todas como lidas" de `PATCH /api/notifications` inclusive fora da janela de 30; 409 com o corpo `current` e ausência de gravação da alteração recusada. O 409 falso do AUD-35 já está coberto em `src/lib/__tests__/ticketChanges.test.js`.
> **Defeito encontrado no caminho:** a AUD-42 removeu o `take: 30` de `GET /api/notifications`; restaurado aplicando o limite depois do filtro de acessibilidade.
> **Validação:** `npx prisma generate` ✅ · lint ✅ · 23 arquivos / 283 testes ✅ · build ✅ · Cypress 55/55 ✅.

- **Severidade:** P3
- **Arquivos:** `src/lib/__tests__/` (18 arquivos), `cypress/e2e/` (7 specs)
- **Problema:** declarado no `AGENTS.md` §10 como política consciente, mas o efeito é que várias regressões só são detectáveis via E2E (lento, banco real): paginação/filtros da lista, marcação de todas as notificações como lidas, reconciliação de estado após 409, e o 409 falso do AUD-35, que **não tem teste E2E** (as specs de concorrência cobrem apenas o 409 legítimo). Há 224 testes e 31 cenários, mas o caminho crítico "PATCH sem mudança não deve gerar 409" não existe.
- **Correção sugerida:** extrair a decisão de "há mudança real?" para uma função pura em `src/lib/` (ex.: `hasTicketChanges(ticket, data)`) e testá-la; ligar essa função ao `PATCH` e ao teste Cypress.

### [x] AUD-44 · Estado técnico dessincronizado e lacunas de documentação viva

- **Severidade:** P3
- **Arquivos:** `ESTADO_ATUAL.md`, `AGENTS.md`, `src/lib/__tests__/docsConsistency.test.js`
- **Problema:**
  1. `ESTADO_ATUAL.md` diz "Última atualização 16/11/2026 — main em `9b4129d`", "220 testes" e "29 cenários"; a `main` está em `9825c10` com **224 testes / 31 cenários**. O guard `docsConsistency.test.js` valida `README.md` e `AGENTS.md`, mas **não** `ESTADO_ATUAL.md`.
  2. `AGENTS.md` §3 não lista `src/lib/ticketConcurrency.js` nem o próprio `docsConsistency.test.js` na árvore (ambos existem; §10 cita os testes corretamente).
  3. `docs/AUDITORIA.md` (não versionado — ver AUD-46) declara "auditoria encerrada, nenhum item em aberto — `main` @ `2c64dd1`", mas 10 PRs (#88–#98) foram mergeados depois; este relatório repõe os IDs a partir de `AUD-35`.
  4. `dashboard/page.js:667` tem emoji "💡" em cabeçalho de UI. A regra §13.2 ("sem emojis nos cabeçalhos") é escrita para PRs; se a intenção vale também para a UI, documentar e remover.
- **Correção sugerida:** atualizar `ESTADO_ATUAL.md` (commit, contagens, branches), incluir `ESTADO_ATUAL.md` no guard `docsConsistency.test.js`, e completar a árvore do §3.
- **Correção aplicada (22/11/2026):** PR [#105](https://github.com/tharciosantos/helpflow/pull/105), branch `fix/aud-44-docs-sincronizadas`, commit `6493672`. `ESTADO_ATUAL.md` atualizado (`main` @ `2c73585`, 273 testes em 22 arquivos, 42 cenários em 9 specs, data de atualização, fases #94–#104); guard `docsConsistency.test.js` valida `ESTADO_ATUAL.md` (cabeçalho + "Onde estamos"; commit e branches ficam fora de propósito para não ficar frágil); árvore do §3 completada com `approval.js`, `cronAuth.js` e o próprio guard; emoji removido do cabeçalho "Dica rápida" em `/dashboard`. Emoji do item 4 constava na linha 772 (não 667). **Validação:** `npx prisma generate` ✅ · `npm run lint` ✅ · `npm run test:run` 22 arquivos / 273 testes ✅ · `npm run build` ✅ · Cypress não reexecutado (PR só toca docs, guard e texto de UI). **Observação:** `ticketConcurrency.js` já estava listado no §3 na baseline; faltavam `approval.js`, `cronAuth.js` e `docsConsistency.test.js`. Outros emojis de UI (não removidos, fora do escopo): `register/page.jsx` 🏢 e 👤 em texto de ajuda.

- **Status:** Concluído — aguardando merge do PR #105.

### [x] AUD-45 · `next.config.mjs` expõe apenas CSP em modo *Report-Only*

- **Severidade:** P3
- **Arquivos:** `next.config.mjs:17-23`
- **Problema:** a política CSP está em `Content-Security-Policy-Report-Only`, ou seja, **não bloqueia nada** — o cabeçalho correto já está desenhado, mas não protege, e não há `report-uri`/`report-to`, então ninguém vê as violações. O playbook de produção deve incluir a troca para `Content-Security-Policy` em aplicação real depois de validada.
- **Observação:** a política hoje usa `script-src 'self' 'unsafe-inline'` e `style-src 'self' 'unsafe-inline'`; sem `'unsafe-inline'` o Next em produção (scripts inline de bootstrap/hidratação) e os estilos inline do projeto (ex.: `NotificationBell` calcula `style` inline) quebrariam — por isso, se a troca for feita, avaliar `nonce`/`hash` no lugar de remover o `unsafe-inline` às cegas.
- **Correção sugerida:** decidir com o usuário entre manter `Report-Only` (com endpoint de coleta) durante a homologação e aplicar `Content-Security-Policy` em produção.
- **Decisão (23/11/2026):** manter **`Report-Only`**, sem trocar para enforcement e sem alterar `next.config.mjs`. A decisão é consciente e fica registrada aqui; nenhum arquivo versionado mudou.
  - **Por que enforcement não está pronto:** a política atual depende de `'unsafe-inline'` em `script-src` e `style-src`, e é isso que a segura. O app injeta scripts inline no SSR (`self.__next_f.push` do RSC e o `ThemeInitScript` de `src/app/components/ThemeInitScript.jsx`) e usa `style` inline em `NotificationBell`, `MobileHeader`, `FeatureCard` e no `next/image` (`color:transparent`). Tirar o `'unsafe-inline'` sem antes mover para `nonce`/`hash` quebraria a hidratação; com o `'unsafe-inline'` presente, o enforcement protegeria quase nada além do que `X-Frame-Options`, `base-uri`, `form-action` e `object-src` já cobrem.
  - **Nonce não é trivial aqui:** `src/middleware.js` hoje é só `withAuth` (matcher em `/dashboard/:path*` e `/ticket/:path*`), sem geração de nonce nem cobertura de todas as rotas. Migrar exige gerar o nonce no middleware, propagá-lo ao `<script>` e ao `script-src`, e ampliar o matcher — um trabalho próprio, não uma troca de constante.
  - **O que foi verificado no caminho:** o app não carrega nenhum recurso de origem externa (login e landing: 12–15 recursos, todos da própria origem); as fontes são `next/font` self-hosted; a única origem externa é `avatars.githubusercontent.com`, já liberada em `img-src`. Isso confirma que a política **está** alinhada com o que o app carrega hoje.
  - **Consequência aceita:** a CSP não bloqueia nada em produção e não há `report-uri`/`report-to`, então nenhuma violação é observada. Se um dia entrar script de terceiro, a política não o detém. O teste de enforcement em modo real (proxy trocando o cabeçalho) chegou a ser montado e foi interrompido; não foi medido se a política atual gera violações sob enforcement.
  - **Gatilho para reabrir:** incluir qualquer origem externa em `script-src`/`connect-src` (analytics, Sentry, CDN) ou adotar nonce no middleware. Nesse momento a troca para `Content-Security-Policy` volta à mesa com os dados que este item levantou.

### [x] AUD-46 · `docs/AUDITORIA.md` fora do versionamento e sem caminho de continuidade

- **Severidade:** P3
- **Arquivos:** `.git/info/exclude:9`, `AGENTS.md` §1.1
- **Problema:** `docs/AUDITORIA.md` está em `.git/info/exclude` (exclusão **local**, não commitada nem propagada a outros clones), enquanto o `AGENTS.md` o trata como "fonte viva" de um backlog com IDs estáveis. Em qualquer clone novo — ou no CI — o arquivo não existe, e a regra "toda correção `AUD-xx` deve atualizar o backlog local" não é verificável. Além disso, a exclusão local não é sincronizada entre máquinas do próprio mantenedor.
- **Correção sugerida:** decidir entre versionar (`git add -f docs/AUDITORIA.md`) ou mover a lista para uma issue/discussion do GitHub; neste último caso, remover a menção de "fonte única" do `AGENTS.md` e apontar para o tracker. Este relatório (`AUDITORIA-2026-11-21.md`) foi gravado como arquivo versionável para permitir essa decisão.
- **Decisão (23/11/2026):** versionar **este relatório** como a fonte viva do backlog, em vez do `docs/AUDITORIA.md` antigo ou de issues do GitHub. O `docs/AUDITORIA.md` continua excluído localmente, como **histórico encerrado** (AUD-01 a AUD-33, `main` @ `2c64dd1`), e não recebe novos itens.
  - **Por que este e não o antigo:** o `AUDITORIA.md` é de outra auditoria (36 itens, todos fechados, baseline `dfe9d90`); fundir os dois reescreveria IDs estáveis e um histórico que ninguém consulta. Este relatório tem os IDs em aberto e o estado atual.
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

## Ordem sugerida de correção

1. **AUD-35** (P1, pequeno, alta frequência) — extrair `hasTicketChanges` + teste.
2. **AUD-36** (P1, pequeno) — esconder o composer de comentário inutilizável via `canCommentOnTicket`.
3. **AUD-38** (P2, pequeno) — chave do rate limit de login por e-mail+IP.
4. **AUD-39** (P2, pequeno) — health check com `SELECT 1`.
5. **AUD-44** (P3, documentação) — atualizar `ESTADO_ATUAL.md` e o guard.
6. **AUD-37** (P2, produto/infra) — decidir com o usuário. (`AUD-45` decidido em 23/11/2026: mantém `Report-Only`.)
7. **AUD-40 a AUD-43, AUD-46** — manutenção incremental.
