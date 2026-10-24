# HelpFlow · Service Desk Corporativo Multi-Empresa

Sistema de Service Desk e gestão de chamados corporativos desenvolvido com **Next.js 15 (App Router)**, **PostgreSQL** e **Prisma ORM**. O HelpFlow foi arquitetado para atender fluxos reais de TI e Suporte Interno em modelo **Multi-Empresa (Multi-Tenant)**, garantindo **isolamento total entre organizações** e **privacidade estrita de chamados entre colaboradores**.

---

## Status do Projeto

**Publicado com demonstração interativa e acesso rápido em 1 clique.**

Todas as funcionalidades centrais de multi-tenancy, isolamento corporativo, cadastro com convite por código, autenticação, triagem ágil e privacidade de tickets estão plenamente implementadas e testadas.

---

## O Modelo de Negócio e Enredo

O HelpFlow replica a dinâmica operacional de um departamento de TI ou suporte corporativo interno:

1. **A Empresa (Perfil `AGENT` · Gestão e TI):**
   - Cria o ambiente corporativo da organização no sistema.
   - Recebe automaticamente um código amigável exclusivo (ex: `TECH-4821`) e um link direto para convidar seus colaboradores (`/register?companyCode=TECH-4821`).
   - Acessa a fila geral de chamados de toda a sua organização.
   - Realiza triagem ágil (alteração de status, definição de prioridade e atribuição de responsável entre qualquer colaborador ou técnico da equipe).

2. **O Funcionário (Perfil `CLIENT` · Colaborador Solicitante):**
   - Cadastra-se vinculando-se à sua empresa por meio do código corporativo ou link de convite.
   - Abre chamados internos (ex: problemas em equipamentos, acessos a sistemas, VPN, software).
   - Visualiza **estritamente os seus próprios chamados**, mantendo sigilo e privacidade total em relação aos demais colegas de trabalho.
   - Caso seja designado como responsável por algum chamado pelo suporte, passa a ter acesso para acompanhar a resolução.

3. **Isolamento Multi-Tenancy:**
   - Cada empresa opera em um silo estritamente isolado. Usuários, métricas e tickets de uma organização nunca são expostos a outra.

---

## Demonstração

- **Aplicação publicada:** [https://helpflow.vercel.app/](https://helpflow.vercel.app/)
- **Repositório:** [https://github.com/tharciosantos/helpflow](https://github.com/tharciosantos/helpflow)

A aplicação conta com **Acesso de Demonstração (1-Clique)** diretamente na tela de login, permitindo explorar as duas visões corporativas da empresa fictícia **HelpFlow Corporativo (Demo)** (`DEMO-2026`):

- **Empresa / TI Demo (`AGENT`):** `agent.demo@helpflow.com` (Senha: `Demo@123456`) - Fila geral corporativa, métricas de atendimento, triagem rápida e gestão de membros.
- **Funcionário Demo (`CLIENT`):** `client.demo@helpflow.com` (Senha: `Demo@123456`) - Abertura e histórico privado de chamados do colaborador.

Além disso, qualquer visitante pode cadastrar sua própria **Empresa** ou se registrar como **Funcionário** utilizando o código da organização.

---

## Demonstração Visual da Jornada

O HelpFlow guia a organização desde a criação do espaço até a resolução e acompanhamento dos chamados. As telas abaixo seguem o tema claro; o tema escuro aparece no fim como alternativa nativa.

| | |
|---|---|
| **1. Descoberta e Apresentação**<br>Landing page com simulador interativo e proposta de valor clara.<br>![Landing Page do HelpFlow](docs/screenshots/01-landing-page-hero.png) | **2. Cadastro Corporativo Segmentado**<br>Criação da Empresa ou entrada do Funcionário via código corporativo.<br>![Cadastro Corporativo Multi-Empresa](docs/screenshots/02-cadastro-multitenant.png) |
| **3. Autenticação e Acesso Rápido**<br>Login com credenciais seguras e acesso de demonstração em 1 clique.<br>![Tela de Login e Demonstração](docs/screenshots/03-login-acesso-demo.png) | **4. Visão da Empresa / TI**<br>Fila geral, indicadores de atendimento e código de convite da empresa.<br>![Dashboard da Empresa / TI](docs/screenshots/04-dashboard-empresa-ti.png) |
| **5. Visão do Colaborador**<br>Histórico estritamente privado dos chamados do funcionário.<br>![Dashboard do Funcionário](docs/screenshots/05-dashboard-funcionario-privado.png) | **6. Abertura de Novo Chamado**<br>Solicitação de suporte com categorização por severidade.<br>![Abertura de Chamado](docs/screenshots/06-abertura-novo-chamado.png) |

### 7. Triagem Ágil e Acompanhamento de Detalhes
Painel de triagem completa na página de detalhes, permitindo alterar status, prioridade e atribuir qualquer membro da empresa.

![Triagem e Detalhes do Chamado](docs/screenshots/07-triagem-e-detalhes-ticket.png)

### 8. Experiência em Tema Escuro
Design em modo dark nativo com paleta de tons neutros e acentos esmeralda.

![Tema Escuro e Responsividade](docs/screenshots/08-tema-escuro-responsivo.png)

---

## Controle de Acesso e Matriz de Privacidade

O sistema adota regras rigorosas de autorização no servidor (RBAC + Multi-tenancy), garantindo que as permissões sejam aplicadas diretamente nas rotas da API:

| Operação | Funcionário Autor | Outro Funcionário (Mesma Empresa) | Funcionário Responsável | Empresa / TI (AGENT) | Outra Empresa |
|---|---|---|---|---|---|
| **Criar chamado** | Sim | Sim | Sim | Sim | Sim (na sua empresa) |
| **Visualizar chamado** | Sim | Bloqueado | Sim | Sim (todos da empresa) | Bloqueado |
| **Comentar no chamado** | Sim | Bloqueado | Sim | Sim | Bloqueado |
| **Excluir comentário** | Sim (próprio) | Bloqueado | Sim (próprio) | Sim (qualquer da empresa) | Bloqueado |
| **Editar título/descrição** | Sim (se Aberto) | Bloqueado | Bloqueado | Sim | Bloqueado |
| **Alterar status/prioridade** | Bloqueado | Bloqueado | Bloqueado | Sim | Bloqueado |
| **Atribuir responsável** | Bloqueado | Bloqueado | Bloqueado | Sim | Bloqueado |
| **Excluir chamado** | Sim (próprio, se Aberto) | Bloqueado | Bloqueado | Sim | Bloqueado |

---

## Endpoints da API REST

A API do HelpFlow segue os padrões REST com validação de payload via Zod, rate limiting distribuído (Upstash) com fallback em memória e verificação estrita de sessão:

| Método | Rota | Descrição | Acesso |
|---|---|---|---|
| `POST` | `/api/register` | Cadastro de Empresa (AGENT) ou Funcionário (CLIENT), via `accountType` e código de convite | Público |
| `POST` | `/api/auth/[...nextauth]` | Autenticação por credenciais e sessões JWT com NextAuth | Público |
| `POST` | `/api/auth/forgot-password` | Solicitação de redefinição de senha por e-mail | Público |
| `POST` | `/api/auth/reset-password` | Validação de token de segurança e definição de nova senha | Público |
| `GET` | `/api/tickets` | Listagem paginada de chamados filtrados por empresa e escopo de permissão | Autenticado |
| `POST` | `/api/tickets` | Abertura de novo chamado com título, descrição e prioridade | Autenticado |
| `GET` | `/api/tickets/[id]` | Consulta detalhada do chamado com timeline de mensagens e autorizações | Autenticado (RBAC) |
| `PATCH` | `/api/tickets/[id]` | Atualização de status, prioridade, responsável ou conteúdo do chamado | Autenticado (RBAC) |
| `DELETE` | `/api/tickets/[id]` | Exclusão controlada de chamado | Autor / Suporte |
| `GET` | `/api/tickets/[id]/comments` | Listagem de comentários e histórico de interações do chamado | Autenticado (RBAC) |
| `POST` | `/api/tickets/[id]/comments` | Envio de nova mensagem no chamado com sanitização de texto | Autenticado (RBAC) |
| `DELETE` | `/api/tickets/[id]/comments/[commentId]` | Remoção de comentário | Autor / AGENT |
| `GET` | `/api/agents` | Listagem de membros da organização para delegação de atendimento | Empresa / TI (AGENT) |
| `GET` | `/api/notifications` | Lista as notificações do usuário, com não lidas primeiro | Autenticado |
| `PATCH` | `/api/notifications` | Marca todas as notificações do usuário como lidas | Autenticado |
| `PATCH` | `/api/notifications/[id]` | Marca uma notificação específica como lida | Autenticado |
| `GET` | `/api/health` | Verificação de integridade da API e conectividade com PostgreSQL | Público |
| `GET` | `/api/cron/keep-alive` | Keep-alive do banco usado pelo Cron da Vercel | `CRON_SECRET` |

---

## Funcionalidades Implementadas

### Multi-tenancy e Organizações
- Criação atômica de Empresa + Conta Agente Gestora via transação Prisma.
- Geração de código corporativo amigável e exclusivo (ex: `CORP-7281`).
- Fluxo de convite direto por link com preenchimento automático do código.
- Associação automática de todos os tickets ao identificador da empresa do usuário logado.

### Autenticação e Segurança
- Cadastro segmentado em abas (Cadastrar Empresa vs Sou Funcionário).
- Criptografia de senhas com hash `bcryptjs` (salt rounds = 10).
- Sessões protegidas com NextAuth.js (JWT) propagando `companyId`, `companyName` e `companyCode`.
- Revogação de sessões via `tokenVersion`: redefinir a senha invalida todos os JWTs anteriores.
- Rate limiting distribuído com Upstash Redis e fallback em memória nas rotas de login, cadastro, comentários e tickets.
- Validação estrita de schemas com Zod no servidor.
- Headers de segurança HTTP configurados (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).

### Gestão, Triagem e Interações de Chamados
- Abertura de chamados com título, descrição detalhada e seleção de prioridade.
- Estados de chamado: Aberto (`OPEN`), Em Progresso (`IN_PROGRESS`) e Fechado (`CLOSED`).
- Níveis de prioridade: Baixa (`LOW`), Média (`MEDIUM`), Alta (`HIGH`) e Urgente (`URGENT`).
- **Sistema de Mensagens e Comentários Internos:** Linha do tempo de interações entre solicitante e suporte diretamente na página de detalhes com identificação visual de papel (`TI / Suporte` vs `Funcionário`).
- **Auditoria de chamados:** `TicketHistory` registra quem alterou status, prioridade, responsável, título, descrição ou prazo.
- Painel de triagem ágil na página de detalhes e no dashboard (alteração rápida de status, prioridade e responsável).
- Atribuição flexível de responsáveis entre todos os membros e técnicos da empresa.
- Indicadores numéricos (KPIs) calculados dinamicamente com base no escopo visível ao usuário.

### SLA, Prazos e Métricas
- Prazo (`dueAt`) derivado da prioridade na abertura: Urgente 4h, Alta 24h, Média 72h e Baixa 7 dias.
- Prazo editável pelo AGENT, com recálculo opcional ao trocar a prioridade.
- Badges e contadores de chamados atrasados calculados on-read.
- `resolvedAt` e `firstResponseAt` para medir tempo de resolução e primeira ação do agente.
- Card de métricas com tempo médio de resolução e tempo até a primeira resposta.

### Notificações In-App
- Sino com contador de não lidas e polling de 30 segundos.
- Notificações para atribuição, comentário público e mudança de status.
- Marcação individual ou em massa (“Ler todas”) via `PATCH /api/notifications`.
- Painel responsivo: bottom-sheet no mobile e flyout no desktop.

### Recuperação de Senhas
- Solicitação de redefinição por e-mail com token seguro de alta entropia (expiração em 15 minutos).
- Envio de e-mail formatado via Nodemailer.
- Validação e invalidação atômica de tokens no banco de dados.
- A redefinição incrementa `tokenVersion` e encerra todas as sessões JWT anteriores do usuário.

### Interface e Experiência do Usuário (UI/UX)
- Tema claro e escuro persistido via cookie `helpflow-theme` e `localStorage`.
- Renderização do tema no servidor (SSR), eliminando oscilação visual (FOUC).
- Design responsivo para dispositivos móveis, tablets e desktops.
- Acessibilidade: rótulos semânticos, foco visível e respeito a `prefers-reduced-motion`.

---

## Modelagem do Banco de Dados (Prisma Schema)

O banco de dados relacional (PostgreSQL) é estruturado em torno do isolamento por organização:

```prisma
model Company {
  id        String   @id @default(uuid())
  name      String
  code      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users     User[]
  tickets   Ticket[]
}

model User {
  id             String    @id @default(uuid())
  name           String?
  email          String    @unique
  password_hash  String?
  image          String?
  role           Role      @default(CLIENT)
  auth_provider  String    @default("credentials")
  tokenVersion   Int       @default(0) // invalida JWTs no reset de senha
  companyId      String?
  company        Company?  @relation(fields: [companyId], references: [id], onDelete: Cascade)

  createdTickets  Ticket[] @relation("TicketAuthor")
  assignedTickets Ticket[] @relation("TicketAgent")
  comments        TicketComment[]
  ticketHistories TicketHistory[]
  notifications   Notification[]
  passwordResets  PasswordReset[]
}

model Ticket {
  id          String   @id @default(cuid())
  title       String
  description String
  status      Status   @default(OPEN)
  priority    Priority @default(MEDIUM)

  companyId   String?
  company     Company? @relation(fields: [companyId], references: [id], onDelete: Cascade)
  authorId    String
  author      User     @relation("TicketAuthor", fields: [authorId], references: [id])
  agentId     String?
  agent       User?    @relation("TicketAgent", fields: [agentId], references: [id])

  dueAt           DateTime? // SLA derivado da prioridade ou ajustado pelo AGENT
  resolvedAt      DateTime? // gravado ao fechar, limpo ao reabrir
  firstResponseAt DateTime? // primeira ação de AGENT no chamado

  comments      TicketComment[]
  histories     TicketHistory[]
  notifications Notification[]
}

model TicketComment {
  id         String            @id @default(cuid())
  content    String            @db.Text
  visibility CommentVisibility @default(PUBLIC)
  ticketId   String
  ticket     Ticket            @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  authorId   String
  author     User              @relation(fields: [authorId], references: [id], onDelete: Cascade)
}

model TicketHistory {
  id        String   @id @default(cuid())
  ticketId  String
  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  actorId   String
  actor     User     @relation(fields: [actorId], references: [id], onDelete: Cascade)
  field     String   // status | priority | agentId | title | description | dueAt
  from      String?
  to        String?
  createdAt DateTime @default(now())
}

model Notification {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  ticketId  String?
  ticket    Ticket?   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  type      String    // ASSIGNED | COMMENT | STATUS
  message   String
  readAt    DateTime?
  createdAt DateTime  @default(now())
}

model PasswordReset {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

> Os modelos `Account` e `Session` do NextAuth também fazem parte do schema completo.

---

## Stack Tecnológica

### Front-end
- **Framework:** Next.js 15 (App Router)
- **Linguagem / UI:** React 19 / JavaScript (ES2022)
- **Estilização:** Tailwind CSS 4
- **Ícones:** React Icons

### Back-end & Autenticação
- **API:** Next.js Route Handlers
- **Autenticação:** NextAuth.js 4 (Prisma Adapter + JWT Session)
- **Criptografia:** bcryptjs
- **Validação:** Zod
- **E-mails:** Nodemailer

### Banco de Dados & ORM
- **Banco:** PostgreSQL (Supabase)
- **ORM:** Prisma ORM 6

### Qualidade & Testes
- **Testes Unitários:** Vitest — 169 testes unitários (14 suítes), cobrindo schemas, RBAC/multiempresa, SLA, métricas, notificações, histórico, sessões e rate limiter.
- **Testes E2E:** Cypress 15 — 15 fluxos E2E cobrindo autenticação, permissões, tickets e comentários.
- **Linter:** ESLint 9

---

## Estrutura do Projeto

```text
src/
├── app/
│   ├── (auth)/              # Rotas de autenticação (login, cadastro, recuperação de senha)
│   ├── (dashboard)/         # Painel protegido (dashboard, criação, edição e detalhes de tickets)
│   ├── api/                 # Endpoints REST (auth, register, tickets, agents, health, cron)
│   └── components/          # Componentes de interface (TicketList, EditTicketForm, ThemeToggle, etc.)
├── lib/
│   ├── __tests__/           # Suíte de 169 testes unitários do Vitest
│   ├── auth.js              # NextAuth, callbacks de sessão e tokenVersion
│   ├── prisma.js            # Instância singleton do PrismaClient
│   ├── rateLimiter.js       # Rate limit Upstash + fallback em memória
│   ├── schemas.js           # Schemas Zod (auth, empresa, funcionário, tickets, comentários)
│   ├── sla.js               # SLA, dueAt, parse de prazo e dias de calendário
│   ├── metrics.js           # Médias de resolução/primeira resposta
│   ├── notifications.js     # Regras de destinatários e mensagens do sino
│   ├── ticketAuthorization.js # RBAC e isolamento multiempresa
│   ├── ticketHistory.js     # Auditoria de mudanças do chamado
│   └── ticketHistoryFormat.js # Formatação da timeline
prisma/
├── schema.prisma            # Modelos relacionais (Company, User, Ticket, TicketHistory, Notification, etc.)
└── migrations/              # Histórico de migrações PostgreSQL
```

---

## Como Executar Localmente

### 1. Clonar o repositório
```bash
git clone https://github.com/tharciosantos/helpflow.git
cd helpflow
```

### 2. Instalar dependências
Requisito: **Node.js 20+**.

```bash
npm install
```

### 3. Configurar variáveis de ambiente
Crie um arquivo `.env` a partir do modelo `.env.example`:
```bash
cp .env.example .env
```

Preencha as variáveis de banco, autenticação, Redis, e-mail, cron e testes:
```env
DATABASE_URL="postgresql://user:password@host:5432/helpflow?schema=public"
DIRECT_URL="postgresql://user:password@host:5432/helpflow?schema=public"

NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="sua-chave-secreta-de-desenvolvimento"

UPSTASH_REDIS_REST_URL="https://seu-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="seu-token"

EMAIL_USER="seu-email@gmail.com"
EMAIL_PASS="sua-app-password"

CRON_SECRET="seu-segredo-cron"
CYPRESS_TEST_SECRET="seu-segredo-cypress"

# Opcional (login social)
AUTH_GITHUB_ID=""
AUTH_GITHUB_SECRET=""
```

### 4. Aplicar migrations e gerar o Prisma Client
```bash
npx prisma migrate dev
npx prisma generate
```

> O `npm run build` executa `prisma migrate deploy` antes do `next build`.

### 5. Iniciar o servidor local
```bash
npm run dev
```
Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

---

## Testes e Validação

```bash
# Executar os 169 testes unitários (14 suítes) com Vitest
npm run test:run

# Executar testes em modo watch
npm run test:watch

# Cobertura de testes
npm run test:coverage

# Executar linter ESLint
npm run lint

# Build de produção (aplica migrations pendentes)
npm run build

# Executar os 15 fluxos E2E com Cypress
npm run cypress:run
```

---

## Autor

**Tharcio Santos**  
- **GitHub:** [https://github.com/tharciosantos](https://github.com/tharciosantos)  
- **LinkedIn:** [https://www.linkedin.com/in/tharcio-santos-dev/](https://www.linkedin.com/in/tharcio-santos-dev/)  
- **Portfólio:** [https://tharcio-portfolio.vercel.app/](https://tharcio-portfolio.vercel.app/)