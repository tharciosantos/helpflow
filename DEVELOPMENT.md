# Desenvolvimento Local

Guia prático para configurar e rodar o HelpFlow localmente com `Next.js`, `Prisma`, `PostgreSQL` e `NextAuth.js`.

## Pré-requisitos

- `Node.js 18+`
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

Exemplo:

```env
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=gere-uma-chave-segura
DATABASE_URL=postgresql://USER:PASSWORD@HOST:6543/postgres
DIRECT_URL=postgresql://USER:PASSWORD@HOST:5432/postgres
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

## Executando o projeto

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Comandos úteis

- `npm run lint` verifica problemas de lint
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
