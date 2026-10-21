import { describe, it, expect } from 'vitest';
import { isTokenVersionCurrent } from '../sessionVersion';

describe('isTokenVersionCurrent', () => {
  it('aceita a versão atual', () => {
    expect(isTokenVersionCurrent(0, 0)).toBe(true);
    expect(isTokenVersionCurrent(3, 3)).toBe(true);
  });

  it('rejeita versões diferentes (senha redefinida)', () => {
    expect(isTokenVersionCurrent(0, 1)).toBe(false);
    expect(isTokenVersionCurrent(2, 3)).toBe(false);
  });

  it('rejeita token antigo sem tokenVersion', () => {
    expect(isTokenVersionCurrent(undefined, 0)).toBe(false);
    expect(isTokenVersionCurrent(null, 0)).toBe(false);
  });
});
