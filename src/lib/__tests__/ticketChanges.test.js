import { describe, it, expect } from 'vitest';
import { hasTicketChanges } from '../ticketChanges';

const baseTicket = {
  id: 'ticket-1',
  title: 'Impressora falhando',
  description: 'Papel atolando',
  status: 'OPEN',
  priority: 'MEDIUM',
  agentId: null,
  dueAt: null,
  resolvedAt: null,
  firstResponseAt: null,
};

describe('hasTicketChanges', () => {
  it('detecta mudança em campo de conteúdo', () => {
    expect(hasTicketChanges(baseTicket, { status: 'IN_PROGRESS' })).toBe(true);
    expect(hasTicketChanges(baseTicket, { title: 'Impressora sem papel' })).toBe(true);
    expect(hasTicketChanges(baseTicket, { agentId: 'agent-1' })).toBe(true);
  });

  it('ignora PATCH com os mesmos valores (caso do 409 falso)', () => {
    expect(hasTicketChanges(baseTicket, {
      status: 'OPEN',
      priority: 'MEDIUM',
      title: 'Impressora falhando',
      description: 'Papel atolando',
      agentId: null,
    })).toBe(false);
  });

  it('ignora dados vazios', () => {
    expect(hasTicketChanges(baseTicket, {})).toBe(false);
    expect(hasTicketChanges(baseTicket, { priority: undefined })).toBe(false);
  });

  it('trata null e undefined como iguais para o responsável', () => {
    expect(hasTicketChanges(baseTicket, { agentId: null })).toBe(false);
    expect(hasTicketChanges({ ...baseTicket, agentId: 'agent-1' }, { agentId: null })).toBe(true);
  });

  it('compara dueAt por valor, mesmo quando um lado é string ISO', () => {
    const ticket = { ...baseTicket, dueAt: new Date('2026-10-20T17:30:00.000Z') };
    expect(hasTicketChanges(ticket, { dueAt: '2026-10-20T17:30:00.000Z' })).toBe(false);
    expect(hasTicketChanges(ticket, { dueAt: '2026-10-21T17:30:00.000Z' })).toBe(true);
    expect(hasTicketChanges(ticket, { dueAt: null })).toBe(true);
  });

  it('considera mudança os campos derivados gravados pelo servidor', () => {
    expect(hasTicketChanges(baseTicket, { resolvedAt: new Date() })).toBe(true);
    expect(hasTicketChanges(baseTicket, { firstResponseAt: new Date() })).toBe(true);
  });

  it('retorna falso sem ticket ou dados', () => {
    expect(hasTicketChanges(null, { status: 'CLOSED' })).toBe(false);
    expect(hasTicketChanges(baseTicket, null)).toBe(false);
  });
});
