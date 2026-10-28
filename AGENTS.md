# AGENTS.md — HelpFlow

> Manual Operacional para Agentes de IA · v2.2

Este documento é a **fonte única de verdade** para agentes que trabalham no repositório **HelpFlow**.

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Estrutura do Projeto](#3-estrutura-do-projeto)
4. [Comandos e Scripts](#4-comandos-e-scripts)
5. [Variáveis de Ambiente](#5-variáveis-de-ambiente-env)
6. [Autenticação e Sessão](#6-autenticação-e-sessão)
7. [Banco de Dados e Prisma](#7-banco-de-dados-e-prisma)
8. [Regras de Negócio e Domínio](#8-regras-de-negócio-e-domínio)
9. [APIs e Rotas](#9-apis-e-rotas)
10. [Testes e Validação](#10-testes-e-validação)
11. [Padrões de Código e UI](#11-padrões-de-código-e-ui)
12. [Git Flow e Conventional Commits](#12-git-flow-e-conventional-commits)
13. [Pull Request](#13-pull-request)
14. [Checklists](#14-checklists)
15. [Exemplos Completos](#15-exemplos-completos)

---

## 1. Visão Geral

O **HelpFlow** é um sistema de help desk e gestão de chamados (tickets) com suporte a múltiplos papéis de usuário (`CLIENT` e `AGENT`), controle de ciclo de vida de tickets, atribuição para agentes, simulação interativa na landing page institucional, recuperação de senhas por e-mail e rate limiting distribuído.

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Versão / Detalhes |
|--------|-----------|-------------------|
| **Framework** | Next.js (App Router) | 15.5.x |
| **Linguagem / UI** | JavaScript (ES2022) / React | 19.1.x |
| **Estilização** | Tailwind CSS v4 (@tailwindcss/postcss) | 4.1.x |
| **ORM / Banco** | Prisma ORM + PostgreSQL | Prisma 6.x |
| **Autenticação** | NextAuth.js (Prisma Adapter + JWT Session) | 4.24.x |
| **Validação** | Zod | 4.x / schemas centralizados |
| **Rate Limiting** | @upstash/ratelimit + @upstash/redis | Sliding window / fallback em memória |
| **Animações** | Anime.js | 4.5.x |
| **E-mail** | Nodemailer | Recuperação de senhas (`EMAIL_USER` / `EMAIL_PASS`) |
| **Testes Unitários** | Vitest | 169 testes de **funções puras** em `src/lib/` (ambiente `node`, sem jsdom, sem Testing Library) |
| **Testes E2E** | Cypress | 15.x — 4 specs em `cypress/e2e/` |
| **Linter** | ESLint (flat config) + eslint-config-next | 9.x |

---

## 3. Estrutura do Projeto

```
helpflow/
├── prisma/
│   ├── schema.prisma          # Modelos: Company, User, Ticket, TicketComment, TicketHistory,
│   │                          #   Notification, Account, Session, PasswordReset
│   └── migrations/            # Histórico de migrations PostgreSQL (10 migrations)
├── src/
│   ├── middleware.js          # withAuth — protege /dashboard/:path* no servidor
│   ├── app/
│   │   ├── (auth)/            # Rotas de autenticação
│   │   │   ├── login/         # Página de login com credenciais de demonstração
│   │   │   ├── register/      # Cadastro de Empresa (AGENT) ou Funcionário (CLIENT) por código
│   │   │   ├── forgot-password/# Solicitação de link de redefinição
│   │   │   └── reset-password/ # Redefinição com validação de token
│   │   ├── (dashboard)/       # Área autenticada protegida
│   │   │   ├── dashboard/     # Painel operacional (KPIs, lista de tickets e filtros)
│   │   │   │   ├── tickets/new/          # Nova chamada
│   │   │   │   └── ticket/[id]/          # Detalhe e edição do chamado
│   │   │   └── layout.js      # Server Component: getServerSession + redirect('/')
│   │   ├── api/               # API Routes (Next.js App Router)
│   │   │   ├── auth/          # [...nextauth], forgot-password, reset-password
│   │   │   ├── agents/        # Listagem de membros da empresa (AGENT)
│   │   │   ├── cron/          # keep-alive do banco (Vercel Cron)
│   │   │   ├── health/        # Health check da aplicação e DB
│   │   │   ├── notifications/ # Sino in-app (GET/PATCH + PATCH por id)
│   │   │   ├── register/      # Criação de contas com hash bcrypt
│   │   │   └── tickets/       # CRUD de tickets + comentários + histórico + estatísticas
│   │   ├── components/        # Componentes reutilizáveis de UI
│   │   │   ├── DemoTicketFlow.jsx  # Simulador interativo da Landing Page
│   │   │   ├── FeatureCard.jsx     # Cards da Landing Page
│   │   │   ├── TicketList.jsx      # Tabela/cards de tickets com paginação
│   │   │   ├── CreateTicketForm.jsx# Formulário de novo ticket
│   │   │   ├── EditTicketForm.jsx  # Edição de status, prioridade, responsável e prazo
│   │   │   ├── CommentsSection.jsx # Timeline unificada (comentários + histórico)
│   │   │   ├── NotificationBell.jsx# Sino com contador e painel (portal)
│   │   │   ├── ConfirmDialog.jsx   # Modal de confirmação de exclusão
│   │   │   ├── SidebarNav.jsx      # Navegação lateral desktop
│   │   │   ├── MobileHeader.jsx    # Header responsivo mobile
│   │   │   ├── DashboardShell.jsx  # Shell do dashboard (sidebar + main)
│   │   │   ├── ThemeProvider.jsx   # Gestão de tema claro/escuro
│   │   │   └── ThemeToggle.jsx     # Botão seletor de tema
│   │   ├── hooks/
│   │   │   └── useScrollReveal.js  # Intersection Observer para animar a landing
│   │   ├── page.js            # Landing Page institucional com simulador
│   │   ├── layout.js          # RootLayout com ThemeProvider e AuthProvider
│   │   └── globals.css        # Tailwind v4 directives e estilos base
│   └── lib/                   # ← Regra de negócio (funções puras) + integrações
│       ├── __tests__/         # 169 testes Vitest (14 arquivos)
│       ├── auth.js            # Configuração do NextAuth, callbacks, authorize e tokenVersion
│       ├── prisma.js          # Instância singleton do PrismaClient
│       ├── email.js           # Envio de e-mails via Nodemailer (EMAIL_USER/EMAIL_PASS)
│       ├── rateLimiter.js     # Rate limit Upstash/Redis + fallback em memória
│       ├── schemas.js         # Schemas Zod (auth, empresa, funcionário, ticket, comentário, reset)
│       ├── ticketUtils.js     # Utilitários de status, prioridade e badges
│       ├── ticketAuthorization.js  # RBAC + isolamento multiempresa (aplicação)
│       ├── ticketHistory.js        # Auditoria de mudanças do chamado
│       ├── ticketHistoryFormat.js  # Formatação da timeline
│       ├── sla.js             # SLA, dueAt, parse de prazo e dias de calendário
│       ├── metrics.js         # Médias de resolução e primeira resposta
│       ├── notifications.js   # Regras de destinatários e mensagens do sino
│       ├── notificationPanel.js    # Geometria do painel de notificações
│       ├── passwordReset.js   # Consumo atômico do token de reset
│       ├── registrationRole.js# Impede escalada de privilégio no cadastro
│       ├── sessionVersion.js  # Validação da versão do JWT
│       └── demoTicketFlow.js  # Sequência de estados do simulador
├── cypress/
│   ├── e2e/                   # auth · tickets · permissions · comments (4 specs)
│   └── support/               # commands.js (createTestUser, login)
└── docs/                      # Screenshots e notas de incidentes
```

---

## 4. Comandos e Scripts

```bash
# Desenvolvimento local
npm run dev              # Inicia servidor Next.js em http://localhost:3000

# Validação e Build
npm run lint             # Executa ESLint em flat config (zero erros)
npm run test:run         # Executa a suíte de testes com Vitest (single run)
npm run test             # Alias para vitest run
npm run test:watch       # Modo watch interativo de testes
npm run test:coverage    # Relatório de cobertura de testes (threshold)
npm run build            # prisma migrate deploy && next build

# Banco de Dados (Prisma)
npx prisma generate      # Gera o client do Prisma
npx prisma migrate dev   # Aplica migrations em ambiente local
npx prisma db push       # Sincroniza schema sem criar migration

# Testes E2E (Cypress)
npm run cypress:open     # Abre a interface gráfica do Cypress
npm run cypress:run      # Executa os testes E2E headless no terminal
```

---

## 5. Variáveis de Ambiente (`.env`)

> Fonte de verdade: `.env.example` (as 12 chaves abaixo são exatamente as consumidas via `process.env` no código).

```env
# Banco de Dados PostgreSQL (Supabase / Neon / Local)
# DATABASE_URL: URL do pooler/transação (porta 6543)
# DIRECT_URL:   conexão direta (porta 5432) — necessária para migrations
DATABASE_URL="postgresql://user:password@host:5432/helpflow?schema=public"
DIRECT_URL="postgresql://user:password@host:5432/helpflow?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="sua-chave-secreta-de-producao"

# Login social opcional (GitHub OAuth)
AUTH_GITHUB_ID=""
AUTH_GITHUB_SECRET=""

# Upstash Redis (Rate Limiting distribuído — opcional; sem ele cai para memória)
UPSTASH_REDIS_REST_URL="https://...upstash.io"
UPSTASH_REDIS_REST_TOKEN="..."

# Nodemailer (Recuperação de Senhas)
# Usa service 'gmail'; com 2FA use senha de app: https://myaccount.google.com/apppasswords
EMAIL_USER="seu-email@gmail.com"
EMAIL_PASS="sua-app-password"

# Vercel Cron — autenticação do /api/cron/keep-alive (Bearer CRON_SECRET)
CRON_SECRET="seu-segredo-cron"

# Cypress — permite criar usuários AGENT nos testes E2E (fora de produção)
CYPRESS_TEST_SECRET="seu-segredo-cypress"
```

`NODE_ENV` também é lido (`auth` e `registrationRole`), mas é injetado automaticamente pelo Next.js.

---

## 6. Autenticação e Sessão

- **NextAuth v4** com `@next-auth/prisma-adapter`.
- Estratégia de sessão: `jwt`.
- Providers: `CredentialsProvider` (e-mail + senha) e `GitHubProvider` (opcional, requer `AUTH_GITHUB_ID`/`AUTH_GITHUB_SECRET`).
- **Papéis de Usuário (`Role`)** — sempre **escopados pela empresa** (`companyId`):
  - `CLIENT`: Cria tickets, visualiza apenas os próprios chamados (ou aqueles em que é responsável) **dentro da própria empresa**; edita só enquanto o chamado está `OPEN`.
  - `AGENT`: Visualiza todos os chamados **da própria empresa**, altera status, prioridade, responsável e prazo. Não enxerga outros tenants.
- **Isolamento multi-tenant e RBAC são garantidos na camada de aplicação**, não no banco:
  - `src/lib/ticketAuthorization.js` centraliza as decisões (`canViewTicket`, `canEditTicketContent`, `canDeleteTicket`, `canCommentOnTicket`, `canDeleteComment`), com regra **fail-closed**.
  - As API Routes reforçam o isolamento nos próprios filtros Prisma (`where: { companyId }` + escopo pessoal), ex.: `src/app/api/tickets/route.js`.
  - **Não há Supabase RLS/Row Level Security nem Policies** configuradas neste projeto. Se houver acesso direto ao banco (fora da aplicação), esse isolamento **não** é aplicado.
- Senhas são criptografadas com `bcryptjs` (salt rounds = 10).
- Revogação de sessão via `User.tokenVersion`: o callback `jwt` valida a versão contra o banco a cada requisição; redefinir a senha incrementa a versão e invalida todos os JWTs anteriores.
- Contas de demonstração (definidas em `src/app/(auth)/login/page.jsx`):
  - **Agente Demo**: `agent.demo@helpflow.com` / `Demo@123456`
  - **Cliente Demo**: `client.demo@helpflow.com` / `Demo@123456`

---

## 7. Banco de Dados e Prisma

### Modelos Principais:
1. **`Company`**: Tenant. `id` (`uuid`), `name`, `code` **único** (código de convite, ex.: `TECH-4821`) e timestamps. Relações com `User` e `Ticket`.
2. **`User`**: Identificador (`uuid`), e-mail único, hash da senha, nome, avatar, `role` (`CLIENT` | `AGENT`), `auth_provider`, `tokenVersion`, `companyId` opcional (FK `Company`, `onDelete: Cascade`), timestamps e relacionamentos `createdTickets` (autor) e `assignedTickets` (responsável).
3. **`Ticket`**: Identificador (`cuid`), título, descrição, status (`OPEN` | `IN_PROGRESS` | `CLOSED`), prioridade (`LOW` | `MEDIUM` | `HIGH` | `URGENT`), `companyId` (FK `Company`), `authorId` (FK `User`), `agentId` (FK opcional `User`), `dueAt`, `resolvedAt`, `firstResponseAt`, timestamps e índices em `authorId`, `status` e `companyId`.
4. **`TicketComment`**: Comentários do chamado com `visibility` (`PUBLIC` | `INTERNAL` — notas internas visíveis apenas a `AGENT`), `authorId` e `ticketId`.
5. **`TicketHistory`**: Auditoria de mudanças (`field`, `from`, `to`, `actorId`), gravada na mesma transação do update.
6. **`Notification`**: Notificações in-app do sino (`userId` destinatário, `ticketId`, `type` `ASSIGNED` | `COMMENT` | `STATUS`, `readAt`).
7. **`PasswordReset`**: Token único, `userId` (FK User), `expiresAt`, flag `used` e índices em `token` e `userId`.
8. **`Account` / `Session`**: Tabelas do Prisma Adapter do NextAuth.

> Conexões: `DATABASE_URL` (pooler) para runtime e `DIRECT_URL` (conexão direta) para migrations — `datasource db` em `prisma/schema.prisma`.

---

## 8. Regras de Negócio e Domínio

- **Ciclo de Vida de Tickets**:
  - `OPEN` → Ticket recém-aberto aguardando triagem.
  - `IN_PROGRESS` → Ticket em atendimento por um agente atribuído.
  - `CLOSED` → Ticket finalizado e resolvido (grava `resolvedAt`; reabrir limpa o campo).
- **Controle de Autorização** (`src/lib/ticketAuthorization.js`, fail-closed):
  - `CLIENT` só visualiza/edita/exclui o **próprio** ticket, e edição/exclusão apenas enquanto estiver `OPEN`.
  - `AGENT` atua em qualquer ticket **da própria empresa**: status, prioridade, responsável e prazo.
  - Campos de triagem (`status`, `priority`, `agentId`, `dueAt`, `recalcDue`) são bloqueados para `CLIENT` no `PATCH`.
  - Contas/tickets **sem empresa** operam em escopo pessoal; ticket com empresa só aceita responsável da mesma empresa.
- **SLA**: `dueAt` é **derivado da prioridade** na criação — `LOW` 168h, `MEDIUM` 72h, `HIGH` 24h, `URGENT` 4h (`src/lib/sla.js`). O `AGENT` pode sobrescrever o prazo ou pedir recálculo (`recalcDue`). Atrasado é **calculado on-read** (`isOverdue`), não armazenado.
- **Notificações in-app**: geradas para atribuição, comentário público e mudança de status; a regra de ouro é **nunca notificar quem praticou a ação** (`src/lib/notifications.js`). Notas internas (`INTERNAL`) não geram notificação.
- **Validação de Entrada**:
  - Todas as requisições para `/api/register`, `/api/tickets`, `/api/tickets/[id]/comments` e redefinição de senha utilizam `zod` para parsing estrito (`src/lib/schemas.js`), com `.strict()` nos payloads de criação.

---

## 9. APIs e Rotas

- `POST /api/register` — Cria **Empresa + AGENT** (`accountType: 'COMPANY'`) ou **Funcionário + CLIENT** vinculado por `companyCode` (`accountType: 'EMPLOYEE'`). O parâmetro `role` só é honrado com `x-test-secret` válido e fora de produção.
- `POST /api/auth/[...nextauth]` — Endpoint do NextAuth (credenciais e GitHub).
- `POST /api/auth/forgot-password` — Gera token (256 bits, 15 min) e envia e-mail. Resposta genérica anti-enumeração.
- `POST /api/auth/reset-password` — Consome o token atomicamente e redefine a senha, incrementando `tokenVersion`.
- `GET /api/tickets` — Lista tickets com busca (`search`), filtros `status`, `priority`, `overdue`, `mine`, ordenação `sort=dueDate|recent` e paginação (`page`, `limit`). Retorna também `summary` com KPIs e médias.
- `POST /api/tickets` — Cria ticket associado ao usuário autenticado e à sua empresa, derivando o `dueAt` do SLA.
- `GET /api/tickets/[id]` — Retorna detalhes do ticket com autor, responsável, comentários (filtrados por `visibility`) e histórico.
- `PATCH /api/tickets/[id]` — Atualiza status, prioridade, responsável, prazo ou conteúdo, com verificação de permissões, auditoria e notificações em transação.
- `DELETE /api/tickets/[id]` — Exclui ticket (autor `CLIENT` só se `OPEN`; `AGENT` da empresa).
- `GET /api/tickets/[id]/comments` — Lista comentários (CLIENT recebe apenas `PUBLIC`).
- `POST /api/tickets/[id]/comments` — Cria comentário (`PUBLIC` ou `INTERNAL`, esta só para `AGENT`).
- `DELETE /api/tickets/[id]/comments/[commentId]` — Remove comentário (autor ou `AGENT`).
- `GET /api/notifications` — Lista notificações do usuário (não lidas primeiro, limite de 30) + `unreadCount`.
- `PATCH /api/notifications` — Marca **todas** as notificações do usuário como lidas.
- `PATCH /api/notifications/[id]` — Marca uma notificação específica como lida (só do próprio usuário).
- `GET /api/agents` — Retorna os membros da empresa para atribuição (exige `AGENT`).
- `GET /api/health` — Verifica conectividade com o banco PostgreSQL.
- `GET /api/cron/keep-alive` — Keep-alive do banco, protegido por `Bearer CRON_SECRET` (Vercel Cron, a cada 3 dias).

---

## 10. Testes e Validação

- **Suíte Vitest — 169 testes em 14 arquivos**: cobrem **funções puras** de `src/lib/` (ambiente `node`, **sem Testing Library e sem jsdom**). Não há testes de componentes ou de Route Handlers.
  - Validações de Schemas Zod (`schemas.test.js`)
  - Utilitários de Tickets e Formatação (`ticketUtils.test.js`)
  - Autorização, RBAC e isolamento multiempresa (`ticketAuthorization.test.js`)
  - Regras de SLA, prazos e fusos (`sla.test.js`)
  - Métricas de atendimento (`metrics.test.js`)
  - Notificações e painel do sino (`notifications.test.js`, `notificationPanel.test.js`)
  - Auditoria e formatação da timeline (`ticketHistory.test.js`, `ticketHistoryFormat.test.js`)
  - Fluxo de Registro e Roles (`registrationRole.test.js`)
  - Recuperação e Expiração de Senhas (`passwordReset.test.js`)
  - Rate Limiting e Fallback em Memória (`rateLimiter.test.js`)
  - Versão de token / revogação de JWT (`sessionVersion.test.js`)
  - Fluxo do Simulador Interativo (`demoTicketFlow.test.js`)
- **E2E Cypress — 4 specs em `cypress/e2e/`**: `auth.cy.js`, `tickets.cy.js`, `permissions.cy.js`, `comments.cy.js`. Rodam contra servidor e banco reais; `cy.createTestUser` cria usuários via `/api/register` com `x-test-secret`.

### 10.1 Validação Obrigatória (Antes do Commit / Push / PR)

Execute e confirme saída limpa (exit code 0) em todos os comandos do projeto:

```bash
npx prisma generate   # 1° — valida schema e gera Prisma Client
npm run lint          # 2° — qualidade de código (ESLint)
npm run test:run      # 3° — suíte unitária (Vitest)
npm run build         # 4° — build de produção Next.js (roda prisma migrate deploy antes)
```

> `npm run build` executa `prisma migrate deploy`: ele aplica migrations pendentes no banco apontado por `DATABASE_URL`. O CI (`.github/workflows/ci.yml`) roda apenas `prisma generate`, `lint` e `test:run`.

---

## 11. Padrões de Código e UI

- **Estética Minimalista & Funcional**: Tipografia legível, bordas discretas em `border-slate-800`, paleta dark neutra com acentos em `teal-500` e badges semânticos (`emerald`, `amber`, `red`, `sky`).
- **Acessibilidade**: Labels para inputs, contrastes adequados e estados de foco visíveis.
- **Responsividade**: Grid fluido de 1 a 4 colunas com adaptação móvel (`sm:`, `md:`, `lg:`).

---

## 12. Git Flow e Conventional Commits

- Trabalhe sempre em branches nomeadas como `feat/`, `fix/`, `refactor/`, `docs/`, `chore/`, `test/`.
- **Regra Obrigatória:** Sempre apresente as alterações e aguarde a avaliação/validação do usuário antes de executar o commit ou push.
- Commits no formato Conventional Commits: `tipo(escopo): descrição concisa`.
- PR com checklist e validação verde em `npx prisma generate`, `npm run lint`, `npm run test:run` e `npm run build`.

---

## 13. Pull Request

### 13.1 Título

```
tipo(escopo): descrição concisa no presente do indicativo (≤ 72 caracteres)
```

Exemplo: `fix(auth): revoga sessoes JWT no reset de senha`

### 13.2 Regras de Redação e Densidade Técnica (Gold Standard)

Para garantir máxima clareza para revisores humanos e indexadores de código:
- **Sem emojis nos cabeçalhos ou listas:** Use Markdown puro (`### Features`, `### Fixes`, `### Docs`, `- [x] Feature`). É proibido usar emojis como `✨`, `🐛`, `📝` no corpo ou título do PR.
- **Resumo de alta densidade (1 a 3 frases):** Descreva o que foi entregue citando nominalmente os módulos, componentes, páginas, rotas ou métricas impactadas (ex: `/dashboard`, `/dashboard/ticket/[id]`, `/reset-password`, `TicketList`, `src/lib/auth.js`). Evite frases genéricas.
- **Verbos de ação na 3ª pessoa do singular:** Inicie os itens do Changelog com verbos no presente do indicativo: *Adiciona*, *Atualiza*, *Corrige*, *Remove*, *Sincroniza*, *Concentra*, *Extrai*, *Revoga*, *Formata*.
- **Como Testar reprodutível:** Comece sempre com o comando de execução (`1. Rode npm run dev.`) e indique as rotas exatas (ex: `/dashboard`, `/dashboard/tickets/new`, `/login`, `/forgot-password`) ou interações exatas para validar a entrega.
- **Tipo de Mudança vertical e limpo:** Liste uma opção por linha, sem emojis, marcando com `[x]` apenas os tipos aplicáveis ao PR.
- **Validação real antes de marcar o Checklist:** O agente DEVE executar cada comando do checklist no terminal e confirmar saída limpa (exit code 0) antes de marcar `[x]`.

### 13.3 Changelog

Agrupe apenas pelas categorias presentes no PR, em texto limpo:

```markdown
### Fixes

- Revoga sessões JWT anteriores após redefinição de senha
- Atualiza validação de sessão em src/lib/auth.js

### Tests

- Adiciona cobertura para invalidação de token em passwordReset.test.js
```

### 13.4 Template Oficial

```markdown
## Resumo

<!-- 1 a 3 frases diretas explicando o que mudou, quais componentes/rotas foram afetados e o impacto. -->

## Tipo de Mudança

- [ ] Feature
- [ ] Fix
- [ ] Refactor
- [ ] Docs
- [ ] Test
- [ ] Chore

## Changelog

### Features

- <!-- Verbo no presente + entrega objetiva -->

## Como Testar

1. Rode `npm run dev`.
2. Abra `<!-- rota ou página (ex: /dashboard ou /dashboard/tickets/new) -->` e confira `<!-- comportamento esperado -->`.

## Checklist

- [ ] Build passa (`npm run build`)
- [ ] Lint passa (`npm run lint`)
- [ ] Testes passam (`npm run test:run`)
- [ ] Prisma Client gerado sem erros (`npx prisma generate`)
- [ ] Apenas arquivos do escopo alterados
```

### 13.5 Exemplo Real de Referência (Gold Standard)

Título: `fix(auth): revoga sessoes JWT no reset de senha`

```markdown
## Resumo

Invalida sessões JWT emitidas antes da redefinição de senha ao sincronizar o timestamp de alteração da credencial no callback `jwt` de `src/lib/auth.js` e no fluxo de `/reset-password`. Inclui cobertura unitária em `src/lib/__tests__/passwordReset.test.js`.

## Tipo de Mudança

- [x] Fix
- [x] Test

## Changelog

### Fixes

- Revoga tokens JWT emitidos antes da última troca de senha do usuário
- Atualiza o fluxo de redefinição em `/reset-password` para registrar invalidação de sessão

### Tests

- Adiciona testes de revogação de sessão em `passwordReset.test.js`

## Como Testar

1. Rode `npm run dev`.
2. Faça login em `/login` e mantenha a sessão ativa.
3. Solicite a redefinição em `/forgot-password` e conclua a troca em `/reset-password`.
4. Acesse `/dashboard` com a sessão anterior e confirme o redirecionamento para `/login`.

## Checklist

- [x] Build passa (`npm run build`)
- [x] Lint passa (`npm run lint`)
- [x] Testes passam (`npm run test:run`)
- [x] Prisma Client gerado sem erros (`npx prisma generate`)
- [x] Apenas arquivos do escopo alterados
```

---

## 14. Checklists

### 14.1 Antes do Commit

- [ ] Alterações apresentadas e aprovadas pelo usuário?
- [ ] Mudança atômica (uma única responsabilidade)?
- [ ] Entradas de API validadas com schemas Zod (`src/lib/schemas.js`)?
- [ ] Controle de autorização (`CLIENT` vs `AGENT`) preservado?
- [ ] Sem `console.log`, `debugger` ou credenciais hardcoded?
- [ ] Mensagem de commit segue Conventional Commits?

### 14.2 Antes do Push

- [ ] `npm run build` passou?
- [ ] `npm run lint` passou?
- [ ] `npm run test:run` passou?
- [ ] `npx prisma generate` passou?
- [ ] `git diff` contém apenas os arquivos esperados?

### 14.3 Antes do PR

- [ ] Checklist 14.2 completo (todos os comandos executados no terminal com exit code 0)
- [ ] Título no formato `tipo(escopo): descrição` (sem emojis)?
- [ ] Resumo de alta densidade (1 a 3 frases) citando módulos/rotas afetados?
- [ ] Tipo de Mudança listado verticalmente sem emojis?
- [ ] Changelog preenchido sem emojis e com verbos na 3ª pessoa do presente?
- [ ] Passos para teste claros e reprodutíveis (iniciando com `1. Rode npm run dev.`)?

---

## 15. Exemplos Completos

### 15.1 Formatar Histórico de Prazo do Chamado

**Tarefa:** Formatar datas no histórico de alterações de prazo na página de detalhes do ticket

**Branch:** `fix/formata-historico-prazo-chamado`

**Commits:**

```
fix(timeline): formata historico de prazo do chamado
test(ticketHistoryFormat): adiciona testes de formatacao de prazo na timeline
```

**Arquivos:** `src/lib/ticketHistoryFormat.js` + `src/app/(dashboard)/ticket/[id]/page.js` + `src/lib/__tests__/ticketHistoryFormat.test.js`

**PR:**

```markdown
## Resumo

Corrige a formatação de datas no histórico de alterações de prazo exibido na timeline do chamado em `/dashboard/ticket/[id]`, utilizando `ticketHistoryFormat.js` para padronizar datas no formato `dd/MM/yyyy` sem deslocamento de fuso horário.

## Tipo de Mudança

- [x] Fix
- [x] Test

## Changelog

### Fixes

- Formata datas de prazo na timeline de `/dashboard/ticket/[id]` no padrão brasileiro
- Corrige parsing de strings ISO em `src/lib/ticketHistoryFormat.js`

### Tests

- Adiciona testes unitários para formatação de histórico de prazo em `ticketHistoryFormat.test.js`

## Como Testar

1. Rode `npm run dev`.
2. Acesse `/login` com a conta Agente Demo (`agent.demo@helpflow.com` / `Demo@123456`) e abra `/dashboard`.
3. Abra os detalhes de um chamado em `/dashboard/ticket/[id]`, altere o prazo e confira o evento na timeline.

## Checklist

- [x] Build passa (`npm run build`)
- [x] Lint passa (`npm run lint`)
- [x] Testes passam (`npm run test:run`)
- [x] Prisma Client gerado sem erros (`npx prisma generate`)
- [x] Apenas arquivos do escopo alterados
```

---

> **Versão 2.2** · Fonte única de verdade para agentes de IA · Mantido por Tharcio Santos
>
> | Versão | Data     | Mudanças                                                                                                                                             |
> | ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
> | 1.0    | —        | Documentação inicial do projeto                                                                                                                      |
> | 2.0    | Out/2026 | Manual operacional completo para agentes de IA                                                                                                       |
> | 2.1    | Out/2026 | Refina padrão de Pull Request com template limpo sem emojis, inclusão de verificação de formatação/tipos no checklist e exemplo Gold Standard        |
> | 2.2    | Out/2026 | Higieniza a documentação contra o código: `db.js` → `prisma.js`, testes descritos como funções puras (sem Testing Library/jsdom) + specs Cypress, isolamento multi-tenant/RBAC documentado como aplicacional (sem Supabase RLS), env de e-mail corrigido para `EMAIL_USER`/`EMAIL_PASS`, credenciais demo, modelos `Company`/`TicketComment`/`TicketHistory`/`Notification`, rotas e estrutura de pastas sincronizadas |
