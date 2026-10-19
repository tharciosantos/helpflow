import { describe, expect, it } from 'vitest';
import {
  canDeleteTicket,
  canEditTicketContent,
  canViewTicket,
  getForbiddenTicketFields,
  canCommentOnTicket,
  canDeleteComment,
  getEditDenialMessage,
} from '../ticketAuthorization';

const owner = { id: 'client-1', role: 'CLIENT', companyId: 'company-A' };
const otherClientSameCompany = { id: 'client-2', role: 'CLIENT', companyId: 'company-A' };
const agentSameCompany = { id: 'agent-1', role: 'AGENT', companyId: 'company-A' };
const otherCompanyClient = { id: 'client-3', role: 'CLIENT', companyId: 'company-B' };
const otherCompanyAgent = { id: 'agent-2', role: 'AGENT', companyId: 'company-B' };

const ticket = { id: 'ticket-1', authorId: owner.id, companyId: 'company-A', status: 'OPEN' };
const closedTicket = { id: 'ticket-1', authorId: owner.id, companyId: 'company-A', status: 'CLOSED' };

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

  describe('contas sem empresa (legado/standalone)', () => {
    const noCompanyAgent = { id: 'agent-legacy', role: 'AGENT', companyId: null };
    const noCompanyClient = { id: 'client-legacy', role: 'CLIENT', companyId: null };
    const legacyOwnTicket = {
      id: 'ticket-legacy',
      authorId: noCompanyClient.id,
      agentId: null,
      companyId: null,
      status: 'OPEN',
    };

    it('não deixa AGENT sem empresa enxergar tickets de empresas', () => {
      expect(canViewTicket(noCompanyAgent, ticket)).toBe(false);
      expect(canEditTicketContent(noCompanyAgent, ticket)).toBe(false);
      expect(canDeleteTicket(noCompanyAgent, ticket)).toBe(false);
    });

    it('não deixa usuário de empresa enxergar ticket sem empresa', () => {
      expect(canViewTicket(agentSameCompany, legacyOwnTicket)).toBe(false);
      expect(canViewTicket(owner, legacyOwnTicket)).toBe(false);
    });

    it('limita conta sem empresa aos próprios tickets (autor ou responsável)', () => {
      expect(canViewTicket(noCompanyClient, legacyOwnTicket)).toBe(true);
      expect(canViewTicket(noCompanyAgent, legacyOwnTicket)).toBe(false);

      const assignedLegacy = { ...legacyOwnTicket, agentId: noCompanyAgent.id };
      expect(canViewTicket(noCompanyAgent, assignedLegacy)).toBe(true);
    });
  });

  it('permite ao CLIENT funcionário visualizar o ticket caso tenha sido atribuído como responsável', () => {
    const assignedEmployee = { id: 'client-2', role: 'CLIENT', companyId: 'company-A' };
    const ticketAssigned = { id: 'ticket-2', authorId: owner.id, agentId: 'client-2', companyId: 'company-A' };
    expect(canViewTicket(assignedEmployee, ticketAssigned)).toBe(true);
  });

  it('bloqueia CLIENT de editar/excluir ticket que saiu de OPEN', () => {
    expect(canEditTicketContent(owner, closedTicket)).toBe(false);
    expect(canDeleteTicket(owner, closedTicket)).toBe(false);
    // AGENT mantém triagem/exclusão (soft-delete na API)
    expect(canEditTicketContent(agentSameCompany, closedTicket)).toBe(true);
    expect(canDeleteTicket(agentSameCompany, closedTicket)).toBe(true);
  });

  it('impede CLIENT de manipular status, prioridade ou atribuição', () => {
    expect(getForbiddenTicketFields(owner, { title: 'Novo título' })).toEqual([]);
    expect(getForbiddenTicketFields(owner, { status: 'CLOSED' })).toEqual(['status']);
    expect(getForbiddenTicketFields(owner, { priority: 'URGENT', agentId: 'agent-1' }))
      .toEqual(['priority', 'agentId']);
  });

  describe('mensagem de recusa de edição', () => {
    it('explica ao autor que o chamado saiu de OPEN', () => {
      expect(getEditDenialMessage(owner, closedTicket))
        .toBe('Chamados em atendimento ou fechados só podem ser editados pela equipe de suporte.');
      expect(getEditDenialMessage(owner, { ...ticket, status: 'IN_PROGRESS' }))
        .toBe('Chamados em atendimento ou fechados só podem ser editados pela equipe de suporte.');
    });

    it('mantém mensagem genérica para quem não é o autor', () => {
      expect(getEditDenialMessage(otherClientSameCompany, closedTicket)).toBe('Não autorizado');
      expect(getEditDenialMessage(otherCompanyClient, closedTicket)).toBe('Não autorizado');
    });

    it('não vaza detalhe do chamado para o AGENT', () => {
      expect(getEditDenialMessage(agentSameCompany, closedTicket)).toBe('Não autorizado');
    });
  });

  it('permite campos administrativos ao AGENT', () => {
    expect(getForbiddenTicketFields(agentSameCompany, {
      status: 'CLOSED',
      priority: 'HIGH',
      agentId: 'agent-1',
    })).toEqual([]);
  });

  describe('autorização de comentários', () => {
    const ownComment = { id: 'comm-1', authorId: owner.id, ticketId: ticket.id };
    const agentComment = { id: 'comm-2', authorId: agentSameCompany.id, ticketId: ticket.id };

    it('permite ao autor do chamado e ao AGENT comentar no chamado', () => {
      expect(canCommentOnTicket(owner, ticket)).toBe(true);
      expect(canCommentOnTicket(agentSameCompany, ticket)).toBe(true);
    });

    it('bloqueia outro colaborador da mesma empresa ou de outra de comentar no chamado', () => {
      expect(canCommentOnTicket(otherClientSameCompany, ticket)).toBe(false);
      expect(canCommentOnTicket(otherCompanyClient, ticket)).toBe(false);
    });

    it('permite ao autor excluir seu próprio comentário', () => {
      expect(canDeleteComment(owner, ownComment, ticket)).toBe(true);
    });

    it('permite ao AGENT moderar e excluir qualquer comentário da sua empresa', () => {
      expect(canDeleteComment(agentSameCompany, ownComment, ticket)).toBe(true);
    });

    it('bloqueia colaborador de excluir comentários de outros usuários', () => {
      expect(canDeleteComment(owner, agentComment, ticket)).toBe(false);
      expect(canDeleteComment(otherClientSameCompany, ownComment, ticket)).toBe(false);
    });
  });
});


