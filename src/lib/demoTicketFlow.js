export const DEMO_TICKET_STATUS_SEQUENCE = [
  'OPEN',
  'IN_PROGRESS',
  'CLOSED',
];

export function getDemoInitialStep(prefersReducedMotion) {
  return prefersReducedMotion ? DEMO_TICKET_STATUS_SEQUENCE.length - 1 : 0;
}
