import { describe, it, expect } from 'vitest';
import { buildHistoryEntries, canViewHistory } from '../ticketHistory';

const baseTicket = {
  id: 'ticket-1',
  authorId: 'client-1',
  agentId: null,
  companyId: 'company-A',
  status: 'OPEN',
  priority: 'MEDIUM',
  title: 'Impressora falhando',
  description: 'Papel atolando',
};

describe('buildHistoryEntries', () => {
  it('gera entradas apenas para campos alterados', () => {
    const entries = buildHistoryEntries({
      ticket: baseTicket,
      data: { status: 'IN_PROGRESS', priority: 'HIGH' },
      actorId: 'agent-1',
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      ticketId: 'ticket-1',
      actorId: 'agent-1',
      field: 'status',
      from: 'OPEN',
      to: 'IN_PROGRESS',
    });
  });

  it('ignora campos iguais aos atuais', () => {
    const entries = buildHistoryEntries({
      ticket: baseTicket,
      data: { status: 'OPEN', title: 'Impressora falhando' },
      actorId: 'agent-1',
    });

    expect(entries).toEqual([]);
  });

  it('normaliza null e undefined para comparacao de responsavel', () => {
    const assigned = buildHistoryEntries({
      ticket: baseTicket,
      data: { agentId: 'agent-1' },
      actorId: 'agent-1',
    });
    expect(assigned[0]).toMatchObject({ field: 'agentId', from: null, to: 'agent-1' });

    const unassigned = buildHistoryEntries({
      ticket: { ...baseTicket, agentId: 'agent-1' },
      data: { agentId: null },
      actorId: 'agent-1',
    });
    expect(unassigned[0]).toMatchObject({ field: 'agentId', from: 'agent-1', to: null });
  });

  it('retorna vazio sem ticket, dados ou ator', () => {
    expect(buildHistoryEntries({ ticket: null, data: {}, actorId: 'a' })).toEqual([]);
    expect(buildHistoryEntries({ ticket: baseTicket, data: null, actorId: 'a' })).toEqual([]);
    expect(buildHistoryEntries({ ticket: baseTicket, data: {}, actorId: null })).toEqual([]);
  });

  it('normaliza mudanças de dueAt como ISO (sem depender do fuso do servidor)', () => {
    const entries = buildHistoryEntries({
      ticket: { ...baseTicket, dueAt: new Date('2026-10-19T12:00:00.000Z') },
      data: { dueAt: new Date('2026-10-20T17:30:00.000Z') },
      actorId: 'agent-1',
    });

    expect(entries[0]).toMatchObject({
      field: 'dueAt',
      from: '2026-10-19T12:00:00.000Z',
      to: '2026-10-20T17:30:00.000Z',
    });
  });

  it('registra remoção de dueAt com to nulo', () => {
    const entries = buildHistoryEntries({
      ticket: { ...baseTicket, dueAt: new Date('2026-10-20T17:30:00.000Z') },
      data: { dueAt: null },
      actorId: 'agent-1',
    });

    expect(entries[0]).toMatchObject({ field: 'dueAt', from: '2026-10-20T17:30:00.000Z', to: null });
  });
});

describe('canViewHistory', () => {
  const owner = { id: 'client-1', role: 'CLIENT', companyId: 'company-A' };
  const agentSame = { id: 'agent-1', role: 'AGENT', companyId: 'company-A' };
  const otherCompany = { id: 'agent-2', role: 'AGENT', companyId: 'company-B' };

  it('permite autor e agente da mesma empresa', () => {
    expect(canViewHistory(owner, baseTicket)).toBe(true);
    expect(canViewHistory(agentSame, baseTicket)).toBe(true);
  });

  it('bloqueia empresa diferente', () => {
    expect(canViewHistory(otherCompany, baseTicket)).toBe(false);
  });

  it('fecha o acesso quando um dos lados não tem empresa', () => {
    const noCompanyAgent = { id: 'agent-legacy', role: 'AGENT', companyId: null };
    const noCompanyTicket = { ...baseTicket, companyId: null };

    expect(canViewHistory(noCompanyAgent, baseTicket)).toBe(false);
    expect(canViewHistory(agentSame, noCompanyTicket)).toBe(false);
    expect(canViewHistory(noCompanyAgent, noCompanyTicket)).toBe(false);
    expect(canViewHistory(noCompanyAgent, { ...noCompanyTicket, authorId: noCompanyAgent.id })).toBe(true);
  });
});
