# AGENTS.md — HelpFlow

> Manual Operacional para Agentes de IA · v2.1

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
| **Rate Limiting** | @upstash/ratelimit + @upstash/redis | Distributed token bucket / fixed window |
| **Animações** | Anime.js | 4.5.x |
| **E-mail** | Nodemailer | Recuperação de senhas |
| **Testes Unitários** | Vitest + Testing Library | jsdom environment, v8 coverage |
| **Testes E2E** | Cypress | 15.x |
| **Linter** | ESLint (flat config) + eslint-config-next | 9.x |

---

## 3. Estrutura do Projeto

```
helpflow/
├── prisma/
│   ├── schema.prisma          # Modelos: User, Ticket, Account, Session, PasswordReset
│   └── migrations/            # Histórico de migrations PostgreSQL
├── src/
│   ├── app/
│   │   ├── (auth)/            # Rotas de autenticação
│   │   │   ├── login/         # Página de login com credenciais de demonstração
│   │   │   ├── register/      # Cadastro de clientes e agentes
│   │   │   ├── forgot-password/# Solicitação de link de redefinição
│   │   │   └── reset-password/ # Redefinição com validação de token
│   │   ├── (dashboard)/       # Área autenticada protegida
│   │   │   ├── dashboard/     # Painel operacional (KPIs, lista de tickets e filtros)
│   │   │   ├── ticket/        # Criação e edição de tickets
│   │   │   └── layout.js      # Layout do dashboard (SidebarNav, MobileHeader, AuthGuard)
│   │   ├── api/               # API Routes (Next.js App Router)
│   │   │   ├── auth/          # NextAuth endpoints (...nextauth)
│   │   │   ├── agents/        # Listagem de agentes disponíveis
│   │   │   ├── cron/          # Rotas de limpeza/tarefas agendadas
│   │   │   ├── health/        # Health check da aplicação e DB
│   │   │   ├── register/      # Criação de contas com hash bcrypt
│   │   │   └── tickets/       # CRUD de tickets + atribuição + estatísticas
│   │   ├── components/        # Componentes reutilizáveis de UI
│   │   │   ├── DemoTicketFlow.jsx  # Simulador interativo da Landing Page
│   │   │   ├── FeatureCard.jsx     # Cards da Landing Page
│   │   │   ├── TicketList.jsx      # Tabela/cards de tickets com paginação
│   │   │   ├── CreateTicketForm.jsx# Formulário modal/página de novo ticket
│   │   │   ├── EditTicketForm.jsx  # Edição de status, prioridade e agente
│   │   │   ├── SidebarNav.jsx      # Navegação lateral desktop
│   │   │   ├── MobileHeader.jsx    # Header responsivo mobile
│   │   │   ├── ThemeProvider.jsx   # Gestão de tema claro/escuro
│   │   │   └── ThemeToggle.jsx     # Botão seletor de tema
│   │   ├── page.js            # Landing Page institucional com simulador
│   │   ├── layout.js          # RootLayout com ThemeProvider e AuthProvider
│   │   └── globals.css        # Tailwind v4 directives e estilos base
│   └── lib/
│       ├── __tests__/         # Suíte de testes unitários Vitest
│       ├── auth.js            # Configuração do NextAuth, callbacks e credenciais
│       ├── db.js              # Instância singleton do PrismaClient
│       ├── email.js           # Envio de e-mails via Nodemailer
│       ├── rateLimiter.js     # Middleware de rate limit Upstash/Redis
│       ├── schemas.js         # Schemas Zod de validação (auth, ticket, reset)
│       └── ticketUtils.js     # Utilitários de status, prioridade e badges
└── public/
    └── previews/              # Screenshots de alta resolução para README e portfólio
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

```env
# Banco de Dados PostgreSQL (Supabase / Neon / Local)
DATABASE_URL="postgresql://user:password@host:5432/helpflow?schema=public"
DIRECT_URL="postgresql://user:password@host:5432/helpflow?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="sua-chave-secreta-de-producao"

# Upstash Redis (Rate Limiting)
UPSTASH_REDIS_REST_URL="https://...upstash.io"
UPSTASH_REDIS_REST_TOKEN="..."

# Nodemailer / SMTP (Recuperação de Senhas)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="seu-email@gmail.com"
SMTP_PASS="sua-app-password"
EMAIL_FROM="HelpFlow <suporte@helpflow.com>"
```

---

## 6. Autenticação e Sessão

- **NextAuth v4** com `@next-auth/prisma-adapter`.
- Estratégia de sessão: `jwt`.
- **Papéis de Usuário (`Role`)**:
  - `CLIENT`: Cria tickets, visualiza apenas seus próprios chamados e atualiza informações básicas.
  - `AGENT`: Visualiza todos os chamados, altera status, altera prioridades e atribui chamados para si ou outros agentes.
- Senhas são criptografadas com `bcryptjs` (salt rounds = 10).
- Contas de demonstração pré-configuradas:
  - **Cliente Demo**: `cliente@helpflow.com` / `demo1234`
  - **Agente Demo**: `agente@helpflow.com` / `demo1234`

---

## 7. Banco de Dados e Prisma

### Modelos Principais:
1. **`User`**: Identificador (`uuid`), e-mail único, hash da senha, nome, avatar, `role` (`CLIENT` | `AGENT`), timestamps e relacionamentos de tickets (`createdTickets`, `assignedTickets`).
2. **`Ticket`**: Identificador (`cuid`), título, descrição, status (`OPEN` | `IN_PROGRESS` | `CLOSED`), prioridade (`LOW` | `MEDIUM` | `HIGH` | `URGENT`), `authorId` (FK User), `agentId` (FK opcional User), timestamps e índices em `authorId` e `status`.
3. **`PasswordReset`**: Token único (`uuid`), `userId` (FK User), data de expiração (`expiresAt`), flag `used` e índices em `token` e `userId`.

---

## 8. Regras de Negócio e Domínio

- **Ciclo de Vida de Tickets**:
  - `OPEN` → Ticket recém-aberto aguardando triagem.
  - `IN_PROGRESS` → Ticket em atendimento por um agente atribuído.
  - `CLOSED` → Ticket finalizado e resolvido.
- **Controle de Autorização**:
  - Clientes só podem editar seus próprios tickets se estiverem em estado `OPEN`.
  - Agentes podem alterar status de qualquer ticket, atribuir responsáveis e mudar prioridade.
- **Validação de Entrada**:
  - Todas as requisições para `/api/register`, `/api/tickets` e redefinição de senha utilizam `zod` para parsing estrito.

---

## 9. APIs e Rotas

- `POST /api/register` — Cria novo usuário (`CLIENT` ou `AGENT`) com validação de formato e checagem de e-mail duplicado.
- `GET /api/tickets` — Lista tickets com suporte a busca (`q`), filtros por status, prioridade e paginação (`page`, `limit`).
- `POST /api/tickets` — Cria novo ticket associado ao usuário autenticado.
- `GET /api/tickets/[id]` — Retorna detalhes completos do ticket e agentes responsáveis.
- `PATCH /api/tickets/[id]` — Atualiza status, prioridade ou agente atribuído com verificação de permissões.
- `DELETE /api/tickets/[id]` — Exclui ticket (restrito a autores autorizados ou administradores).
- `GET /api/agents` — Retorna lista de agentes ativos para atribuição de chamados.
- `GET /api/health` — Verifica conectividade com o banco PostgreSQL.

---

## 10. Testes e Validação

- **Suíte Vitest**: Testes unitários cobrindo:
  - Validações de Schemas Zod (`schemas.test.js`)
  - Utilitários de Tickets e Formatação (`ticketUtils.test.js`)
  - Autorização e Regras de Negócio (`ticketAuthorization.test.js`)
  - Fluxo de Registro e Roles (`registrationRole.test.js`)
  - Recuperação e Expiração de Senhas (`passwordReset.test.js`)
  - Rate Limiting e Fallback em Memória (`rateLimiter.test.js`)
  - Fluxo do Simulador Interativo (`demoTicketFlow.test.js`)

### 10.1 Validação Obrigatória (Antes do Commit / Push / PR)

Execute e confirme saída limpa (exit code 0) em todos os comandos do projeto:

```bash
npx prisma generate   # 1° — valida schema e gera Prisma Client
npm run lint          # 2° — qualidade de código (ESLint)
npm run test:run      # 3° — suíte unitária (Vitest)
npm run build         # 4° — build de produção Next.js
```

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
- **Resumo de alta densidade (1 a 3 frases):** Descreva o que foi entregue citando nominalmente os módulos, componentes, páginas, rotas ou métricas impactadas (ex: `/dashboard`, `/ticket/[id]`, `/reset-password`, `TicketList`, `src/lib/auth.js`). Evite frases genéricas.
- **Verbos de ação na 3ª pessoa do singular:** Inicie os itens do Changelog com verbos no presente do indicativo: *Adiciona*, *Atualiza*, *Corrige*, *Remove*, *Sincroniza*, *Concentra*, *Extrai*, *Revoga*, *Formata*.
- **Como Testar reprodutível:** Comece sempre com o comando de execução (`1. Rode npm run dev.`) e indique as rotas exatas (ex: `/dashboard`, `/ticket`, `/login`, `/forgot-password`) ou interações exatas para validar a entrega.
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
2. Abra `<!-- rota ou página (ex: /dashboard ou /ticket) -->` e confira `<!-- comportamento esperado -->`.

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
test(ticketUtils): adiciona testes de formatacao de prazo na timeline
```

**Arquivos:** `src/lib/ticketUtils.js` + `src/app/(dashboard)/ticket/[id]/page.js` + `src/lib/__tests__/ticketUtils.test.js`

**PR:**

```markdown
## Resumo

Corrige a formatação de datas no histórico de alterações de prazo exibido na timeline do chamado em `/ticket/[id]`, utilizando `ticketUtils.js` para padronizar datas no formato `dd/MM/yyyy` sem deslocamento de fuso horário.

## Tipo de Mudança

- [x] Fix
- [x] Test

## Changelog

### Fixes

- Formata datas de prazo na timeline de `/ticket/[id]` no padrão brasileiro
- Corrige parsing de strings ISO em `src/lib/ticketUtils.js`

### Tests

- Adiciona testes unitários para formatação de histórico de prazo em `ticketUtils.test.js`

## Como Testar

1. Rode `npm run dev`.
2. Acesse `/login` com a conta Agente Demo (`agente@helpflow.com`) e abra `/dashboard`.
3. Abra os detalhes de um chamado em `/ticket/[id]`, altere o prazo e confira o evento na timeline.

## Checklist

- [x] Build passa (`npm run build`)
- [x] Lint passa (`npm run lint`)
- [x] Testes passam (`npm run test:run`)
- [x] Prisma Client gerado sem erros (`npx prisma generate`)
- [x] Apenas arquivos do escopo alterados
```

---

> **Versão 2.1** · Fonte única de verdade para agentes de IA · Mantido por Tharcio Santos
>
> | Versão | Data     | Mudanças                                                                                                                                             |
> | ------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
> | 1.0    | —        | Documentação inicial do projeto                                                                                                                      |
> | 2.0    | Out/2026 | Manual operacional completo para agentes de IA                                                                                                       |
> | 2.1    | Out/2026 | Refina padrão de Pull Request com template limpo sem emojis, inclusão de verificação de formatação/tipos no checklist e exemplo Gold Standard        |
