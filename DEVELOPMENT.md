# Desenvolvimento Local

Guia prático para configurar e rodar o HelpFlow localmente com `Next.js`, `Prisma`, `PostgreSQL` e `NextAuth.js`.

## Pré-requisitos

- `Node.js >= 22.23.4`
- `npm`
- `Git`
- Conta no [GitHub](https://github.com/)
- Conta no [Supabase](https://supabase.com/) se for usar a mesma estratégia de banco em nuvem

## Setup inicial

### 1. Clone o projeto

```bash
git clone https://github.com/tharciosantos/helpflow.git
cd helpflow
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o `.env`

Crie um `.env` na raiz com base em `.env.example`:

```bash
cp .env.example .env
```

Modelo completo (mesmas 12 chaves de `.env.example`):

```env
# GitHub OAuth (opcional)
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=gere-uma-chave-segura

# Banco de dados (Supabase)
# DATABASE_URL: URL do pooler/transação (porta 6543)
# DIRECT_URL:   conexão direta (porta 5432) — necessária para migrations
DATABASE_URL=postgresql://USER:PASSWORD@HOST:6543/postgres
DIRECT_URL=postgresql://USER:PASSWORD@HOST:5432/postgres

# Vercel Cron — autenticação de /api/cron/keep-alive
CRON_SECRET=gere-um-segredo

# Cypress — permite criar usuários AGENT nos testes E2E
CYPRESS_TEST_SECRET=segredo-cypress

# E-mail (Nodemailer) — recuperação de senha
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-app-password

# Upstash Redis — rate limiting distribuído (opcional em dev; sem ele usa memória)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

## Banco de dados

### Supabase + Prisma

- `DATABASE_URL`: use a URL do pooler/transação, normalmente na porta `6543`
- `DIRECT_URL`: use a conexão direta do banco, normalmente na porta `5432`
- Ajuste ambas conforme o projeto criado no Supabase

Para sincronizar o schema atual:

```bash
npx prisma db push
npx prisma generate
```

Se quiser inspecionar os dados:

```bash
npx prisma studio
```

### Dados de demonstração

Para criar a empresa `DEMO-2026`, as contas `agent.demo@helpflow.com` e `client.demo@helpflow.com` (senha `Demo@123456`) e alguns chamados de exemplo:

```bash
npm run db:seed
```

O seed é idempotente: pode ser reexecutado sem duplicar registros e não sobrescreve a senha de contas já existentes.

## Autenticação

### Email e senha

- O cadastro está disponível em `/register`
- O login por credenciais está disponível em `/login`
- As senhas são armazenadas com hash via `bcryptjs`
- Novos usuários são criados com papel `CLIENT`

### GitHub OAuth

Para habilitar login com GitHub:

1. Crie uma OAuth App em `GitHub > Settings > Developer settings > OAuth Apps`
2. Defina `Homepage URL` como `http://localhost:3000`
3. Defina `Authorization callback URL` como `http://localhost:3000/api/auth/callback/github`
4. Copie `Client ID` e `Client Secret` para `AUTH_GITHUB_ID` e `AUTH_GITHUB_SECRET`

### Recuperação de senha

Para testar o fluxo de recuperação de senha localmente:

1. Configure `EMAIL_USER` e `EMAIL_PASS` no `.env`
2. Para Gmail com 2FA habilitado, gere uma [Senha de App](https://myaccount.google.com/apppasswords)
3. Acesse `/forgot-password` e insira um email cadastrado
4. Verifique a caixa de entrada do email configurado em `EMAIL_USER`
5. Clique no link recebido para acessar `/reset-password?token=...`
6. Defina uma nova senha (mínimo de 8 caracteres)

O token expira em 15 minutos por segurança.

## Executando o projeto

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Comandos úteis

- `npm run lint` verifica problemas de lint
- `npm run db:seed` popula empresa, contas e chamados de demonstração
- `npx prisma db push` sincroniza o schema sem gerar migration
- `npx prisma generate` recria o Prisma Client
- `npx prisma studio` abre o painel visual do banco

## Problemas comuns

### Prisma + Supabase Pooler

Se aparecer erro relacionado a `prepared statement` durante o desenvolvimento:

- pare o servidor
- rode `npm run dev` novamente

Esse problema costuma acontecer por causa do hot reload combinado com o pooler do Supabase.

### Falha de conexão com o banco

Se aparecer `Can't reach database server`:

- valide `DATABASE_URL` e `DIRECT_URL`
- confira se o projeto Supabase está ativo
- confirme usuário, senha, host e portas
