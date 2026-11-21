// ---------------------------------------------------------------------------
// Aprovação de contas criadas por código de empresa (AUD-37).
//
// O cadastro de funcionário nasce PENDING: conhecer o companyCode deixa de
// bastar para entrar no tenant. Um AGENT da mesma empresa aprova (ACTIVE) ou
// recusa (REJECTED); só ACTIVE autentica. Função pura, coberta por testes.
// ---------------------------------------------------------------------------

export const APPROVAL_STATUS = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  REJECTED: 'REJECTED',
};

// Status ausente (contas anteriores à coluna) equivale a ACTIVE.
export function isApprovedUser(approvalStatus) {
  return approvalStatus === undefined || approvalStatus === null || approvalStatus === APPROVAL_STATUS.ACTIVE;
}

export function isPendingUser(approvalStatus) {
  return approvalStatus === APPROVAL_STATUS.PENDING;
}

/**
 * Decide se `actor` pode aprovar/recusar `target`.
 *
 * - só AGENT decide;
 * - apenas dentro da própria empresa (fail-closed: conta sem empresa nunca
 *   decide sobre conta de empresa);
 * - a decisão vale somente para contas PENDING (nada de rebaixar um ACTIVE);
 * - ninguém decide sobre a própria conta nem promove/rebaixa outro AGENT —
 *   aprovação é a porta do funcionário, não um botão de gestão de papéis.
 */
export function canApproveUser(actor, target) {
  if (!actor?.id || !target?.id) return false;
  if (actor.role !== 'AGENT') return false;
  if (!actor.companyId || target.companyId !== actor.companyId) return false;
  if (target.id === actor.id) return false;
  if (target.role !== 'CLIENT') return false;
  return target.approvalStatus === APPROVAL_STATUS.PENDING;
}

// HTTP de `approve` — mantido aqui para a rota e os testes usarem a mesma
// decisão, sem duplicar a regra.
export function getApprovalDenial(actor, target) {
  if (!target) return { status: 404, message: 'Usuário não encontrado.' };
  if (!actor?.companyId || target.companyId !== actor.companyId) {
    return { status: 404, message: 'Usuário não encontrado.' };
  }
  if (actor.role !== 'AGENT') {
    return { status: 403, message: 'Não autorizado' };
  }
  if (target.id === actor.id || target.role === 'AGENT') {
    return { status: 403, message: 'Não é possível aprovar esta conta.' };
  }
  if (target.approvalStatus !== APPROVAL_STATUS.PENDING) {
    return { status: 409, message: 'Esta conta já foi analisada.' };
  }
  return null;
}

export function getApprovalUpdate(action) {
  return action === 'REJECT' ? APPROVAL_STATUS.REJECTED : APPROVAL_STATUS.ACTIVE;
}
