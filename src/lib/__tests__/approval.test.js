import { describe, expect, it } from 'vitest';
import {
  APPROVAL_STATUS,
  canApproveUser,
  getApprovalDenial,
  getApprovalUpdate,
  isApprovedUser,
  isPendingUser,
} from '../approval';

const agent = { id: 'agent-1', role: 'AGENT', companyId: 'company-A' };
const otherAgent = { id: 'agent-2', role: 'AGENT', companyId: 'company-B' };
const client = { id: 'client-1', role: 'CLIENT', companyId: 'company-A' };

const pending = { id: 'new-1', role: 'CLIENT', companyId: 'company-A', approvalStatus: 'PENDING' };
const active = { ...pending, approvalStatus: 'ACTIVE' };
const rejected = { ...pending, approvalStatus: 'REJECTED' };

describe('aprovação de contas por código de empresa (AUD-37)', () => {
  describe('status de aprovação', () => {
    it('trata apenas ACTIVE como aprovado e contas sem a coluna como legado aprovado', () => {
      expect(isApprovedUser(APPROVAL_STATUS.ACTIVE)).toBe(true);
      expect(isApprovedUser(undefined)).toBe(true);
      expect(isApprovedUser(null)).toBe(true);
      expect(isApprovedUser(APPROVAL_STATUS.PENDING)).toBe(false);
      expect(isApprovedUser(APPROVAL_STATUS.REJECTED)).toBe(false);
    });

    it('reconhece apenas PENDING como pendente', () => {
      expect(isPendingUser(APPROVAL_STATUS.PENDING)).toBe(true);
      expect(isPendingUser(APPROVAL_STATUS.ACTIVE)).toBe(false);
      expect(isPendingUser(undefined)).toBe(false);
    });
  });

  describe('canApproveUser', () => {
    it('permite ao AGENT da mesma empresa decidir sobre um CLIENT pendente', () => {
      expect(canApproveUser(agent, pending)).toBe(true);
    });

    it('bloqueia AGENT de outra empresa', () => {
      expect(canApproveUser(otherAgent, pending)).toBe(false);
    });

    it('bloqueia quem não é AGENT', () => {
      expect(canApproveUser(client, pending)).toBe(false);
      expect(canApproveUser({ ...agent, role: 'CLIENT' }, pending)).toBe(false);
    });

    it('bloqueia conta sem empresa e alvo sem empresa', () => {
      expect(canApproveUser({ id: 'agent-3', role: 'AGENT', companyId: null }, pending)).toBe(false);
      expect(canApproveUser(agent, { ...pending, companyId: null })).toBe(false);
    });

    it('só decide sobre contas PENDING', () => {
      expect(canApproveUser(agent, active)).toBe(false);
      expect(canApproveUser(agent, rejected)).toBe(false);
    });

    it('não decide sobre a própria conta nem sobre outro AGENT', () => {
      expect(canApproveUser(agent, { ...agent, approvalStatus: 'PENDING' })).toBe(false);
      expect(canApproveUser(agent, { ...pending, role: 'AGENT' })).toBe(false);
    });

    it('falha fechado com entradas incompletas', () => {
      expect(canApproveUser(null, pending)).toBe(false);
      expect(canApproveUser(agent, null)).toBe(false);
    });
  });

  describe('getApprovalDenial', () => {
    it('não recusa o caso feliz', () => {
      expect(getApprovalDenial(agent, pending)).toBeNull();
    });

    it('responde 404 para alvo inexistente ou de outro tenant', () => {
      expect(getApprovalDenial(agent, null)).toMatchObject({ status: 404 });
      expect(getApprovalDenial(agent, { ...pending, companyId: 'company-B' })).toMatchObject({ status: 404 });
      expect(getApprovalDenial({ ...agent, companyId: null }, pending)).toMatchObject({ status: 404 });
    });

    it('responde 403 para quem não é AGENT ou tenta decidir sobre AGENT/própria conta', () => {
      expect(getApprovalDenial(client, pending)).toMatchObject({ status: 403 });
      expect(getApprovalDenial(agent, { ...pending, role: 'AGENT' })).toMatchObject({ status: 403 });
      expect(getApprovalDenial(agent, { ...agent, companyId: 'company-A', approvalStatus: 'PENDING' }))
        .toMatchObject({ status: 403 });
    });

    it('responde 409 quando a conta já foi analisada', () => {
      expect(getApprovalDenial(agent, active)).toMatchObject({ status: 409 });
      expect(getApprovalDenial(agent, rejected)).toMatchObject({ status: 409 });
    });
  });

  it('mapeia a ação para o status gravado', () => {
    expect(getApprovalUpdate('APPROVE')).toBe('ACTIVE');
    expect(getApprovalUpdate('REJECT')).toBe('REJECTED');
    // Qualquer outro valor só chega após o schema Zod; o padrão é conservador.
    expect(getApprovalUpdate('APPROVE')).not.toBe('PENDING');
  });
});
