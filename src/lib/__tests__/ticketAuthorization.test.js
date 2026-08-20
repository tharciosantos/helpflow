import { describe, expect, it } from 'vitest';
import {
  canDeleteTicket,
  canEditTicketContent,
  canViewTicket,
  getForbiddenTicketFields,
} from '../ticketAuthorization';

const owner = { id: 'client-1', role: 'CLIENT', companyId: 'company-A' };
const otherClientSameCompany = { id: 'client-2', role: 'CLIENT', companyId: 'company-A' };
const agentSameCompany = { id: 'agent-1', role: 'AGENT', companyId: 'company-A' };
const otherCompanyClient = { id: 'client-3', role: 'CLIENT', companyId: 'company-B' };
const otherCompanyAgent = { id: 'agent-2', role: 'AGENT', companyId: 'company-B' };

const ticket = { id: 'ticket-1', authorId: owner.id, companyId: 'company-A' };

describe('autorização de tickets com isolamento multi-empresa', () => {
  it('permite ao CLIENT funcionário autor visualizar, editar conteúdo e excluir seu próprio ticket', () => {
    expect(canViewTicket(owner, ticket)).toBe(true);
    expect(canEditTicketContent(owner, ticket)).toBe(true);
    expect(canDeleteTicket(owner, ticket)).toBe(true);
  });

  it('bloqueia outro funcionário da MESMA empresa de acessar o ticket do colega', () => {
    expect(canViewTicket(otherClientSameCompany, ticket)).toBe(false);
    expect(canEditTicketContent(otherClientSameCompany, ticket)).toBe(false);
    expect(canDeleteTicket(otherClientSameCompany, ticket)).toBe(false);
  });

  it('permite ao AGENT da mesma empresa visualizar, editar e excluir qualquer ticket da sua empresa', () => {
    expect(canViewTicket(agentSameCompany, ticket)).toBe(true);
    expect(canEditTicketContent(agentSameCompany, ticket)).toBe(true);
    expect(canDeleteTicket(agentSameCompany, ticket)).toBe(true);
  });

  it('bloqueia AGENT de OUTRA empresa de acessar tickets que não pertencem à sua organização', () => {
    expect(canViewTicket(otherCompanyAgent, ticket)).toBe(false);
    expect(canEditTicketContent(otherCompanyAgent, ticket)).toBe(false);
    expect(canDeleteTicket(otherCompanyAgent, ticket)).toBe(false);
  });

  it('bloqueia CLIENT de OUTRA empresa de acessar tickets de outra organização', () => {
    expect(canViewTicket(otherCompanyClient, ticket)).toBe(false);
    expect(canEditTicketContent(otherCompanyClient, ticket)).toBe(false);
    expect(canDeleteTicket(otherCompanyClient, ticket)).toBe(false);
  });

  it('permite ao CLIENT funcionário visualizar o ticket caso tenha sido atribuído como responsável', () => {
    const assignedEmployee = { id: 'client-2', role: 'CLIENT', companyId: 'company-A' };
    const ticketAssigned = { id: 'ticket-2', authorId: owner.id, agentId: 'client-2', companyId: 'company-A' };
    expect(canViewTicket(assignedEmployee, ticketAssigned)).toBe(true);
  });

  it('impede CLIENT de manipular status, prioridade ou atribuição', () => {
    expect(getForbiddenTicketFields(owner, { title: 'Novo título' })).toEqual([]);
    expect(getForbiddenTicketFields(owner, { status: 'CLOSED' })).toEqual(['status']);
    expect(getForbiddenTicketFields(owner, { priority: 'URGENT', agentId: 'agent-1' }))
      .toEqual(['priority', 'agentId']);
  });

  it('permite campos administrativos ao AGENT', () => {
    expect(getForbiddenTicketFields(agentSameCompany, {
      status: 'CLOSED',
      priority: 'HIGH',
      agentId: 'agent-1',
    })).toEqual([]);
  });
});

