# AGENTS.md — HelpFlow

> Manual Operacional para Agentes de IA · v2.0

Este documento é a **fonte única de verdade** para agentes que trabalham no repositório **HelpFlow**.

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Estrutura do Projeto](#3-estrutura-do-projeto)
4. [Comandos e Scripts](#4-comandos-e-scripts)
5. [Variáveis de Ambiente](#5-variáveis-de-ambiente)
6. [Autenticação e Sessão](#6-autenticação-e-sessão)
7. [Banco de Dados e Prisma](#7-banco-de-dados-e-prisma)
8. [Regras de Negócio e Domínio](#8-regras-de-negócio-e-domínio)
9. [APIs e Rotas](#9-apis-e-rotas)
10. [Testes e Validação](#10-testes-e-validação)
11. [Padrões de Código e UI](#11-padrões-de-código-e-ui)
12. [Git Flow e Conventional Commits](#12-git-flow-e-conventional-commits)

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
npm run test             # Executa a suíte de testes com Vitest
npm run test:watch       # Modo watch interativo de testes
npm run test:coverage    # Relatório de cobertura de testes (threshold)
npm run build            # Gera build de produção otimizado

# Banco de Dados (Prisma)
npx prisma generate      # Gera o client do Prisma tipado
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

Execute sempre `npm run test` e `npm run lint` antes de submeter código.

---

## 11. Padrões de Código e UI

- **Estética Minimalista & Funcional**: Tipografia legível, bordas discretas em `border-slate-800`, paleta dark neutra com acentos em `teal-500` e badges semânticos (`emerald`, `amber`, `red`, `sky`).
- **Acessibilidade**: Labels para inputs, contrastes adequados e estados de foco visíveis.
- **Responsividade**: Grid fluido de 1 a 4 colunas com adaptação móvel (`sm:`, `md:`, `lg:`).

---

## 12. Git Flow e Conventional Commits

- Trabalhe sempre em branches nomeadas como `feat/`, `fix/`, `refactor/`, `docs/`, `chore/`.
- Commits no formato Conventional Commits: `tipo(escopo): descrição concisa`.
- PR obrigatório com checklist e validação verde em `test`, `lint` e `build`.
