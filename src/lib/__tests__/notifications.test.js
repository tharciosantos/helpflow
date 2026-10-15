import { describe, it, expect } from 'vitest';
import { resolveNotificationRecipients, buildNotificationMessage } from '../notifications';

const ticket = { id: 't1', authorId: 'client-1', agentId: 'agent-1' };

describe('resolveNotificationRecipients', () => {
  describe('COMMENT', () => {
    it('agente comenta -> notifica o autor', () => {
      const r = resolveNotificationRecipients({
        event: 'COMMENT',
        actor: { id: 'agent-1', role: 'AGENT' },
        ticket,
      });
      expect(r).toEqual(['client-1']);
    });

    it('autor comenta -> notifica o agente responsavel', () => {
      const r = resolveNotificationRecipients({
        event: 'COMMENT',
        actor: { id: 'client-1', role: 'CLIENT' },
        ticket,
      });
      expect(r).toEqual(['agent-1']);
    });

    it('autor comenta em ticket sem agente -> ninguem', () => {
      const r = resolveNotificationRecipients({
        event: 'COMMENT',
        actor: { id: 'client-1', role: 'CLIENT' },
        ticket: { authorId: 'client-1', agentId: null },
      });
      expect(r).toEqual([]);
    });

    it('nunca notifica quem praticou a acao', () => {
      // autor comenta e tambem e o "outro lado" (sem agente) -> vazio
      const r = resolveNotificationRecipients({
        event: 'COMMENT',
        actor: { id: 'client-1', role: 'CLIENT' },
        ticket: { authorId: 'client-1', agentId: 'client-1' },
      });
      expect(r).toEqual([]);
    });
  });

  describe('ASSIGNED', () => {
    it('notifica o novo responsavel', () => {
      const r = resolveNotificationRecipients({
        event: 'ASSIGNED',
        actor: { id: 'client-1', role: 'AGENT' },
        ticket,
        newAgentId: 'agent-2',
      });
      expect(r).toEqual(['agent-2']);
    });

    it('nao notifica se o responsavel atribui a si mesmo', () => {
      const r = resolveNotificationRecipients({
        event: 'ASSIGNED',
        actor: { id: 'agent-1', role: 'AGENT' },
        ticket,
        newAgentId: 'agent-1',
      });
      expect(r).toEqual([]);
    });
  });

  describe('STATUS', () => {
    it('notifica o autor do ticket', () => {
      const r = resolveNotificationRecipients({
        event: 'STATUS',
        actor: { id: 'agent-1', role: 'AGENT' },
        ticket,
      });
      expect(r).toEqual(['client-1']);
    });

    it('nao notifica o autor quando ele mesmo muda o status', () => {
      const r = resolveNotificationRecipients({
        event: 'STATUS',
        actor: { id: 'client-1', role: 'CLIENT' },
        ticket,
      });
      expect(r).toEqual([]);
    });
  });

  it('evento desconhecido nao gera destinatarios', () => {
    const r = resolveNotificationRecipients({
      event: 'UNKNOWN',
      actor: { id: 'agent-1', role: 'AGENT' },
      ticket,
    });
    expect(r).toEqual([]);
  });
});

describe('buildNotificationMessage', () => {
  it('gera mensagem de comentario', () => {
    const msg = buildNotificationMessage({
      event: 'COMMENT', actorName: 'Maria', ticketTitle: 'Impressora',
    });
    expect(msg).toBe('Maria comentou no chamado "Impressora".');
  });

  it('gera mensagem de atribuicao', () => {
    const msg = buildNotificationMessage({
      event: 'ASSIGNED', actorName: 'Joao', ticketTitle: 'Rede',
    });
    expect(msg).toBe('Joao atribuiu um chamado para voce "Rede".');
  });

  it('gera mensagem de status', () => {
    const msg = buildNotificationMessage({
      event: 'STATUS', actorName: 'Ana', ticketTitle: 'Bug',
    });
    expect(msg).toBe('O chamado "Bug" teve o status atualizado por Ana.');
  });

  it('sem titulo nao inclui aspas', () => {
    const msg = buildNotificationMessage({ event: 'COMMENT', actorName: 'Maria' });
    expect(msg).toBe('Maria comentou no chamado.');
  });
});
