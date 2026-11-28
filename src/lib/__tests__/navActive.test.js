import { describe, it, expect } from 'vitest';
import { NAV_ITEMS, isNavItemActive, getActiveNavHref } from '../navActive';

describe('NAV_ITEMS', () => {
  it('lista o item mais específico antes do Dashboard', () => {
    expect(NAV_ITEMS.map((item) => item.href)).toEqual([
      '/dashboard/tickets/new',
      '/dashboard',
    ]);
  });
});

describe('isNavItemActive', () => {
  const dashboard = { href: '/dashboard' };
  const newTicket = { href: '/dashboard/tickets/new' };

  it('acende o item na rota exata', () => {
    expect(isNavItemActive(dashboard, '/dashboard')).toBe(true);
    expect(isNavItemActive(newTicket, '/dashboard/tickets/new')).toBe(true);
  });

  it('ignora a barra final e a rota vazia', () => {
    expect(isNavItemActive(dashboard, '/dashboard/')).toBe(true);
    expect(isNavItemActive(dashboard, '/dashboard///')).toBe(true);
    expect(isNavItemActive(dashboard, '')).toBe(false);
  });

  it('o Dashboard não acende em subrotas', () => {
    expect(isNavItemActive(dashboard, '/dashboard/tickets/new')).toBe(false);
    expect(isNavItemActive(dashboard, '/dashboard/ticket/abc')).toBe(false);
  });

  it('um item com subrota acende abaixo de si', () => {
    expect(isNavItemActive(newTicket, '/dashboard/tickets/new/')).toBe(true);
    expect(isNavItemActive(newTicket, '/dashboard/tickets/new/passos')).toBe(true);
  });

  it('não confunde prefixo de texto com subrota', () => {
    expect(
      isNavItemActive(newTicket, '/dashboard/tickets/newest')
    ).toBe(false);
  });
});

describe('getActiveNavHref', () => {
  it('acende Novo Chamado na própria rota', () => {
    expect(getActiveNavHref('/dashboard/tickets/new')).toBe(
      '/dashboard/tickets/new'
    );
  });

  it('acende o Dashboard na lista de chamados', () => {
    expect(getActiveNavHref('/dashboard')).toBe('/dashboard');
    expect(getActiveNavHref('/dashboard/')).toBe('/dashboard');
  });

  it('mantém o Dashboard aceso nas rotas de chamado', () => {
    expect(getActiveNavHref('/ticket/cmn75rp5h0001ky04nk3va1gx')).toBe(
      '/dashboard'
    );
    expect(
      getActiveNavHref('/dashboard/ticket/cmn75rp5h0001ky04nk3va1gx/edit')
    ).toBe('/dashboard');
  });

  it('não acende nada fora da área autenticada', () => {
    expect(getActiveNavHref('/')).toBeNull();
    expect(getActiveNavHref('/login')).toBeNull();
    expect(getActiveNavHref('/reset-password')).toBeNull();
    expect(getActiveNavHref('/tickets')).toBeNull();
    expect(getActiveNavHref(null)).toBeNull();
  });
});
