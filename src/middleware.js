import { withAuth } from 'next-auth/middleware';

// Protege todo o dashboard no servidor (evita flash de conteúdo sem sessão).
// O layout do dashboard mantém getServerSession como segunda camada.
export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: ['/dashboard/:path*'],
};
