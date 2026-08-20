# HelpFlow · Service Desk Corporativo Multi-Empresa

Sistema de Service Desk e gestão de chamados corporativos desenvolvido com **Next.js 15 (App Router)**, **PostgreSQL** e **Prisma ORM**. O HelpFlow foi arquitetado para atender fluxos reais de TI e Suporte Interno em modelo **Multi-Empresa (Multi-Tenant)**, garantindo **isolamento total entre organizações** e **privacidade estrita de chamados entre colaboradores**.

---

## Status do Projeto

**Em evolução contínua, com versão disponível em produção.**

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

- **Aplicação em produção:** [https://helpflow.vercel.app/](https://helpflow.vercel.app/)
- **Repositório:** [https://github.com/tharciosantos/helpflow](https://github.com/tharciosantos/helpflow)

A aplicação conta com **Acesso de Demonstração (1-Clique)** diretamente na tela de login, permitindo explorar as duas visões corporativas da empresa fictícia **HelpFlow Corporativo (Demo)** (`DEMO-2026`):

- **Empresa / TI Demo (`AGENT`):** `agent.demo@helpflow.com` (Senha: `Demo@123456`) - Fila geral corporativa, métricas de atendimento, triagem rápida e gestão de membros.
- **Funcionário Demo (`CLIENT`):** `client.demo@helpflow.com` (Senha: `Demo@123456`) - Abertura e histórico privado de chamados do colaborador.

Além disso, qualquer visitante pode cadastrar sua própria **Empresa** ou se registrar como **Funcionário** utilizando o código da organização.

---

## Demonstração Visual da Jornada

O HelpFlow guia a organização desde a criação do espaço até a resolução e acompanhamento dos chamados:

### 1. Descoberta e Apresentação
Apresentação moderna com simulador interativo de chamados e proposta de valor clara.
![Landing Page do HelpFlow](docs/screenshots/01-landing-page-hero.png)

### 2. Cadastro Corporativo Segmentado
Ambiente unificado para criação do espaço da Empresa ou entrada do Funcionário via código corporativo.
![Cadastro Corporativo Multi-Empresa](docs/screenshots/02-cadastro-multitenant.png)

### 3. Autenticação e Acesso Rápido de Demonstração
Tela de login com suporte a credenciais seguras e acesso 1-clique para teste das duas visões.
![Tela de Login e Demonstração](docs/screenshots/03-login-acesso-demo.png)

### 4. Visão da Empresa / TI (Gestão Geral e Convites)
Fila geral de tickets corporativos, indicadores de atendimento e código de convite da empresa.
![Dashboard da Empresa / TI](docs/screenshots/04-dashboard-empresa-ti.png)

### 5. Visão do Colaborador (Privacidade Total)
Histórico estritamente privado dos chamados do funcionário dentro da organização.
![Dashboard do Funcionário](docs/screenshots/05-dashboard-funcionario-privado.png)

### 6. Abertura de Novo Chamado Interno
Interface simples e direta para solicitação de suporte com categorização por severidade.
![Abertura de Chamado](docs/screenshots/06-abertura-novo-chamado.png)

### 7. Triagem Ágil e Acompanhamento de Detalhes
Painel de triagem completa na página de detalhes, permitindo alterar status, prioridade e atribuir qualquer membro da empresa.
![Triagem e Detalhes do Chamado](docs/screenshots/07-triagem-e-detalhes-ticket.png)

### 8. Experiência em Tema Claro
Consistência e legibilidade com contraste balanceado para ambientes claros.
![Tema Claro e Responsividade](docs/screenshots/08-tema-claro-responsivo.png)

### 9. Experiência em Tema Escuro
Design sofisticado em modo dark nativo com paleta de tons neutros e acentos esmeralda.
![Tema Escuro e Responsividade](docs/screenshots/09-tema-escuro-responsivo.png)

---

## Controle de Acesso e Matriz de Privacidade

O sistema adota regras rigorosas de autorização no servidor (RBAC + Multi-tenancy), garantindo que as permissões sejam aplicadas diretamente nas rotas da API:

| Operação | Funcionário Autor | Outro Funcionário (Mesma Empresa) | Funcionário Responsável | Empresa / TI (AGENT) | Outra Empresa |
|---|---|---|---|---|---|
| **Criar chamado** | Sim | Sim | Sim | Sim | Sim (na sua empresa) |
| **Visualizar chamado** | Sim | Bloqueado | Sim | Sim (todos da empresa) | Bloqueado |
| **Editar título/descrição** | Sim | Bloqueado | Sim | Sim | Bloqueado |
| **Alterar status/prioridade** | Bloqueado | Bloqueado | Bloqueado | Sim | Bloqueado |
| **Atribuir responsável** | Bloqueado | Bloqueado | Bloqueado | Sim | Bloqueado |
| **Excluir chamado** | Sim | Bloqueado | Bloqueado | Sim | Bloqueado |

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
- Rate limiting em memória com expiração automática nas rotas de login, cadastro e tickets.
- Validação estrita de schemas com Zod no servidor.
- Headers de segurança HTTP configurados (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).

### Gestão e Triagem de Chamados
- Abertura de chamados com título, descrição detalhada e seleção de prioridade.
- Estados de chamado: Aberto (`OPEN`), Em Progresso (`IN_PROGRESS`) e Fechado (`CLOSED`).
- Níveis de prioridade: Baixa (`LOW`), Média (`MEDIUM`), Alta (`HIGH`) e Urgente (`URGENT`).
- Painel de triagem ágil na página de detalhes e no dashboard (alteração rápida de status, prioridade e responsável).
- Atribuição flexível de responsáveis entre todos os membros e técnicos da empresa.
- Indicadores numéricos (KPIs) calculados dinamicamente com base no escopo visível ao usuário.

### Recuperação de Senhas
- Solicitação de redefinição por e-mail com token seguro de alta entropia (expiração em 15 minutos).
- Envio de e-mail formatado via Nodemailer.
- Validação e invalidação atômica de tokens no banco de dados.

### Interface e Experiência do Usuário (UI/UX)
- Tema claro e escuro persistido via cookie `helpflow-theme` e `localStorage`.
- Renderização do tema no servidor (SSR), eliminando oscilação visual (FOUC).
- Design responsivo para dispositivos móveis, tablets e desktops.
- Acessibilidade: rótulos semânticos, foco visível e respeito a `prefers-reduced-motion`.

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
- **Testes Unitários:** Vitest
- **Testes E2E:** Cypress 15
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
│   ├── __tests__/           # Suíte de testes unitários do Vitest
│   ├── auth.js              # Configuração do NextAuth e callbacks de sessão
│   ├── prisma.js            # Instância singleton do PrismaClient
│   ├── rateLimiter.js       # Middleware de taxa limite
│   ├── schemas.js           # Schemas Zod de validação (auth, empresa, funcionário, tickets)
│   └── ticketAuthorization.js # Regras de autorização e isolamento multi-empresa
prisma/
├── schema.prisma            # Modelos relacionais (Company, User, Ticket, Account, etc.)
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
```bash
npm install
```

### 3. Configurar variáveis de ambiente
Crie um arquivo `.env` a partir do modelo `.env.example`:
```bash
cp .env.example .env
```

Preencha as variáveis de banco de dados e autenticação:
```env
DATABASE_URL="postgresql://user:password@host:5432/helpflow?schema=public"
DIRECT_URL="postgresql://user:password@host:5432/helpflow?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="sua-chave-secreta-de-desenvolvimento"
```

### 4. Sincronizar o banco de dados
```bash
npx prisma db push
npx prisma generate
```

### 5. Iniciar o servidor local
```bash
npm run dev
```
Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

---

## Testes e Validação

```bash
# Executar testes unitários com Vitest
npm test

# Executar testes em modo watch
npm run test:watch

# Executar linter ESLint
npm run lint

# Executar testes E2E com Cypress
npm run cypress:run
```

---

## Autor

**Tharcio Santos**  
- **GitHub:** [https://github.com/tharciosantos](https://github.com/tharciosantos)  
- **LinkedIn:** [https://www.linkedin.com/in/tharcio-santos-dev/](https://www.linkedin.com/in/tharcio-santos-dev/)  
- **Portfólio:** [https://tharcio-portfolio.vercel.app/](https://tharcio-portfolio.vercel.app/)

