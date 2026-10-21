import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { checkRateLimit } from "@/lib/rateLimiter";
import { isTokenVersionCurrent } from "@/lib/sessionVersion";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHubProvider({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      allowDangerousEmailAccountLinking: false,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const { isLimited } = await checkRateLimit(`login:${credentials.email}`);
        if (isLimited) {
          throw new Error('Muitas tentativas de login. Tente novamente em 15 minutos.');
        }
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            company: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        });

        if (!user) {
          throw new Error("Invalid credentials");
        }

        if (!user.password_hash) {
          throw new Error("Invalid credentials");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password_hash,
        );

        if (!isValid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          companyId: user.companyId || null,
          companyName: user.company?.name || null,
          companyCode: user.company?.code || null,
          tokenVersion: user.tokenVersion ?? 0,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.companyId = user.companyId || null;
        token.companyName = user.companyName || null;
        token.companyCode = user.companyCode || null;
        token.tokenVersion = user.tokenVersion ?? 0;
        token.revoked = false;
      }

      // Tokens emitidos antes da existência do tokenVersion são inválidos.
      if (!token.id || token.tokenVersion === undefined || token.tokenVersion === null) {
        token.revoked = true;
        return token;
      }

      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: {
            tokenVersion: true,
            role: true,
            companyId: true,
            company: { select: { name: true, code: true } },
          },
        });

        if (!dbUser || !isTokenVersionCurrent(token.tokenVersion, dbUser.tokenVersion)) {
          token.revoked = true;
          return token;
        }

        // Mantém role/empresa atualizados sem exigir novo login.
        token.revoked = false;
        token.role = dbUser.role;
        token.companyId = dbUser.companyId || null;
        token.companyName = dbUser.company?.name || null;
        token.companyCode = dbUser.company?.code || null;
      } catch (error) {
        // Falha fechada: se não for possível validar a versão, invalida a sessão.
        console.error('[auth] Falha ao validar tokenVersion:', error?.message);
        token.revoked = true;
      }

      return token;
    },
    async session({ session, token }) {
      // Sessão nula derruba getServerSession/useSession e força novo login.
      if (!token || token.revoked) return null;

      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.companyId = token.companyId || null;
        session.user.companyName = token.companyName || null;
        session.user.companyCode = token.companyCode || null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
