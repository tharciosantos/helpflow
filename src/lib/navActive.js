// Item ativo da navegação lateral — item 11 do backlog.
//
// O SidebarNav comparava `pathname === '/dashboard'`, e as rotas de chamado
// (`/ticket/[id]`, `/dashboard/ticket/[id]/edit`) ficam fora da `/dashboard`
// exata: nada aparecia selecionado nelas. A regra de qual item acende vive
// aqui, pura, para ser testada.

export const NAV_ITEMS = [
  { href: '/dashboard/tickets/new', label: 'Novo Chamado' },
  { href: '/dashboard', label: 'Dashboard' },
];

// `/dashboard/` e `/dashboard` são a mesma rota.
function normalize(pathname) {
  if (!pathname) return '/';
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

// O item cobre a rota exata e as subrotas abaixo dela. A ordem importa: o item
// mais específico vem primeiro, para `/dashboard/tickets/new` não acender em
// `Dashboard`. O Dashboard não usa prefixo: qualquer `/dashboard/...` acenderia
// ele, inclusive a lista de chamados, que é a própria página do painel.
export function isNavItemActive({ href }, pathname) {
  const current = normalize(pathname);
  const target = normalize(href);
  if (current === target) return true;
  if (target === '/dashboard') return false;
  return current.startsWith(`${target}/`);
}

// Rotas que não são itens da sidebar (detalhe e edição de chamado) mantêm o
// "Dashboard" aceso como âncora: o usuário saiu do painel e precisa ver de onde
// veio. Autenticação e landing não acendem nada.
const STANDALONE_ROUTE = /^\/(ticket|dashboard\/ticket)(\/|$)/;

export function getActiveNavHref(pathname) {
  const current = normalize(pathname);
  const item = NAV_ITEMS.find((candidate) => isNavItemActive(candidate, current));
  if (item) return item.href;
  if (STANDALONE_ROUTE.test(current)) return '/dashboard';
  return null;
}
