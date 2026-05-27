import NextAuth from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { checkRateLimit } from "@/lib/rateLimiter";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHubProvider({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      allowDangerousEmailAccountLinking: true,
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

        // Rate limit por email — bloqueia brute force na mesma conta
        // Usa o email como identifier para que o bloqueio seja por conta,
        // não por IP (evita bloquear múltiplos usuários atrás do mesmo IP)
        const { isLimited } = checkRateLimit(`login:${credentials.email}`);
        if (isLimited) {
          throw new Error('Muitas tentativas de login. Tente novamente em 15 minutos.');
        }
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        // Check if user exists and uses credentials provider
        if (!user) {
          throw new Error("User not found");
        }

        // If user signed up with GitHub but trying to login with password, or vice versa if we were stricter
        if (user.auth_provider && user.auth_provider !== "credentials") {
          throw new Error(`User registered with ${user.auth_provider}`);
        }

        if (!user.password_hash) {
          throw new Error("User has no password set");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password_hash,
        );

        if (!isValid) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id   = user.id;
        token.role = user.role; // propaga o role do banco para o JWT
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id   = token.id;
        session.user.role = token.role; // expõe o role via useSession e getServerSession
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
