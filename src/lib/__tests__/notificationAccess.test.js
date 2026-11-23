import { describe, it, expect } from 'vitest';
import { partitionNotificationsByAccess, remainingUnreadCount } from '../notificationAccess';

function assignedTo(userId, ticketId = 't1') {
  return {
    id: `n-${userId}-${ticketId}`,
    type: 'ASSIGNED',
    readAt: null,
    ticketId,
    ticket: { id: ticketId, title: 'Impressora' },
  };
}

function visibleItem(id, readAt = null) {
  return { id, readAt, canOpen: true };
}

describe('partitionNotificationsByAccess', () => {
  it('mantém aberta a notificação enquanto o usuário ainda vê o chamado', () => {
    // Retorno do canViewTicket cobre autor, responsável, AGENT da empresa e o
    // escopo pessoal legado — o detalhe dessas regras vive em
    // ticketAuthorization.test.js.
    const canView = (user, ticket) => ticket.agentId === user.id;
    const { visible, hidden } = partitionNotificationsByAccess(
      { id: 'client-1' },
      [assignedTo('client-1')],
      new Map([['t1', { id: 't1', agentId: 'client-1' }]]),
      { canView }
    );

    expect(hidden).toEqual([]);
    expect(visible).toHaveLength(1);
    expect(visible[0].canOpen).toBe(true);
  });

  it('esconde a notificação ASSIGNED depois da reatribuição (AUD-42)', () => {
    // O responsável passou de client-1 para client-2.
    const canView = (user, ticket) => ticket.agentId === user.id;
    const { visible, hidden } = partitionNotificationsByAccess(
      { id: 'client-1' },
      [assignedTo('client-1')],
      new Map([['t1', { id: 't1', agentId: 'client-2' }]]),
      { canView }
    );

    expect(visible).toEqual([]);
    expect(hidden).toHaveLength(1);
    expect(hidden[0].canOpen).toBe(false);
  });

  it('esconde a notificação quando o responsável é removido', () => {
    const canView = (user, ticket) => ticket.agentId === user.id;
    const { hidden } = partitionNotificationsByAccess(
      { id: 'client-1' },
      [assignedTo('client-1')],
      new Map([['t1', { id: 't1', agentId: null }]]),
      { canView }
    );

    expect(hidden).toHaveLength(1);
  });

  it('esconde notificação cujo chamado foi excluído (sem estado no banco)', () => {
    const { visible, hidden } = partitionNotificationsByAccess(
      { id: 'client-1' },
      [assignedTo('client-1', 'gone')],
      new Map(),
      { canView: () => true }
    );

    expect(visible).toEqual([]);
    expect(hidden).toHaveLength(1);
  });

  it('resolve o chamado pelo ticketId quando o include não trouxe o ticket', () => {
    const canView = (user, ticket) => ticket.agentId === user.id;
    const { visible } = partitionNotificationsByAccess(
      { id: 'client-1' },
      [{ id: 'n1', ticketId: 't9', ticket: null, readAt: null }],
      new Map([['t9', { id: 't9', agentId: 'client-1' }]]),
      { canView }
    );

    expect(visible).toHaveLength(1);
  });

  it('preserva a ordem recebida da API', () => {
    const list = [assignedTo('client-1'), { ...assignedTo('client-1'), id: 'n2', ticketId: 't2' }];
    const tickets = new Map([
      ['t1', { id: 't1', agentId: 'client-1' }],
      ['t2', { id: 't2', agentId: 'client-1' }],
    ]);
    const { visible } = partitionNotificationsByAccess({ id: 'client-1' }, list, tickets, {
      canView: (user, ticket) => ticket.agentId === user.id,
    });

    expect(visible.map((n) => n.id)).toEqual(['n-client-1-t1', 'n2']);
  });

  it('usa canViewTicket por padrão (isolamento multiempresa fail-closed)', () => {
    const clientA = { id: 'client-a', role: 'CLIENT', companyId: 'company-a' };
    const ticketDaA = { id: 't1', authorId: 'client-a', agentId: 'client-b', companyId: 'company-a' };
    const ticketDaB = { id: 't1', authorId: 'client-a', agentId: 'client-a', companyId: 'company-b' };

    const naEmpresa = partitionNotificationsByAccess(clientA, [assignedTo('client-a')], new Map([['t1', ticketDaA]]));
    const foraDaEmpresa = partitionNotificationsByAccess(clientA, [assignedTo('client-a')], new Map([['t1', ticketDaB]]));

    expect(naEmpresa.visible).toHaveLength(1);
    expect(foraDaEmpresa.hidden).toHaveLength(1);
  });
});

describe('remainingUnreadCount', () => {
  it('conta só as não lidas que continuam na lista', () => {
    const count = remainingUnreadCount([
      visibleItem('n1'),
      visibleItem('n2', '2026-11-21T10:00:00Z'),
      visibleItem('n3'),
    ]);

    expect(count).toBe(2);
  });

  it('devolve 0 para lista vazia (todas as notificações inacessíveis)', () => {
    expect(remainingUnreadCount([])).toBe(0);
  });
});
