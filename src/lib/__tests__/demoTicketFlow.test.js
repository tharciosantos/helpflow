import { describe, expect, it } from 'vitest';
import {
  DEMO_TICKET_STATUS_SEQUENCE,
  getDemoInitialStep,
} from '../demoTicketFlow';

describe('fluxo demonstrativo de tickets', () => {
  it('usa a mesma sequência de status do produto', () => {
    expect(DEMO_TICKET_STATUS_SEQUENCE).toEqual([
      'OPEN',
      'IN_PROGRESS',
      'CLOSED',
    ]);
  });

  it('começa aberto quando animações são permitidas', () => {
    expect(getDemoInitialStep(false)).toBe(0);
  });

  it('mostra o resultado final quando o movimento é reduzido', () => {
    expect(getDemoInitialStep(true)).toBe(2);
  });
});
