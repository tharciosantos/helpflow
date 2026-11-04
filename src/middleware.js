import { withAuth } from 'next-auth/middleware';

// Protege as áreas autenticadas no servidor (evita flash de conteúdo sem sessão).
// O layout do grupo (dashboard) mantém getServerSession como segunda camada.
export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  // /ticket/[id] fica fora do prefixo /dashboard, então precisa do próprio matcher.
  matcher: ['/dashboard/:path*', '/ticket/:path*'],
};
