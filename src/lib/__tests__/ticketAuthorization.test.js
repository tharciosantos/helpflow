import { describe, expect, it } from 'vitest';
import {
  canDeleteTicket,
  canEditTicketContent,
  canViewTicket,
  getForbiddenTicketFields,
} from '../ticketAuthorization';

const owner = { id: 'client-1', role: 'CLIENT' };
const otherClient = { id: 'client-2', role: 'CLIENT' };
const agent = { id: 'agent-1', role: 'AGENT' };
const ticket = { id: 'ticket-1', authorId: owner.id };

describe('autorização de tickets', () => {
  it('permite ao CLIENT proprietário visualizar, editar conteúdo e excluir', () => {
    expect(canViewTicket(owner, ticket)).toBe(true);
    expect(canEditTicketContent(owner, ticket)).toBe(true);
    expect(canDeleteTicket(owner, ticket)).toBe(true);
  });

  it('bloqueia um CLIENT não proprietário em todas as operações do ticket', () => {
    expect(canViewTicket(otherClient, ticket)).toBe(false);
    expect(canEditTicketContent(otherClient, ticket)).toBe(false);
    expect(canDeleteTicket(otherClient, ticket)).toBe(false);
  });

  it('permite ao AGENT visualizar, editar e excluir qualquer ticket', () => {
    expect(canViewTicket(agent, ticket)).toBe(true);
    expect(canEditTicketContent(agent, ticket)).toBe(true);
    expect(canDeleteTicket(agent, ticket)).toBe(true);
  });

  it('impede CLIENT de manipular status, prioridade ou atribuição', () => {
    expect(getForbiddenTicketFields(owner, { title: 'Novo título' })).toEqual([]);
    expect(getForbiddenTicketFields(owner, { status: 'CLOSED' })).toEqual(['status']);
    expect(getForbiddenTicketFields(owner, { priority: 'URGENT', agentId: 'agent-1' }))
      .toEqual(['priority', 'agentId']);
  });

  it('permite campos administrativos ao AGENT', () => {
    expect(getForbiddenTicketFields(agent, {
      status: 'CLOSED',
      priority: 'HIGH',
      agentId: 'agent-1',
    })).toEqual([]);
  });
});
