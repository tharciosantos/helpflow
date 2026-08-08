import { describe, expect, it, vi } from 'vitest';
import {
  PasswordResetUnavailableError,
  updatePasswordWithResetToken,
} from '../passwordReset';

function createPrismaMock(claimedCount) {
  const transaction = {
    passwordReset: {
      updateMany: vi.fn().mockResolvedValue({ count: claimedCount }),
    },
    user: {
      update: vi.fn().mockResolvedValue({}),
    },
  };

  return {
    prisma: {
      $transaction: vi.fn((callback) => callback(transaction)),
    },
    transaction,
  };
}

describe('consumo do token de redefinição de senha', () => {
  it('consome o token antes de atualizar a senha', async () => {
    const { prisma, transaction } = createPrismaMock(1);
    const now = new Date('2026-08-07T12:00:00.000Z');

    await updatePasswordWithResetToken({
      prisma,
      passwordReset: { id: 'reset-1', userId: 'user-1' },
      hashedPassword: 'hash-seguro',
      now,
    });

    expect(transaction.passwordReset.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'reset-1',
        used: false,
        expiresAt: { gt: now },
      },
      data: { used: true },
    });
    expect(transaction.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { password_hash: 'hash-seguro' },
    });
  });

  it('rejeita uma tentativa concorrente sem alterar a senha', async () => {
    const { prisma, transaction } = createPrismaMock(0);

    await expect(updatePasswordWithResetToken({
      prisma,
      passwordReset: { id: 'reset-1', userId: 'user-1' },
      hashedPassword: 'outro-hash',
    })).rejects.toBeInstanceOf(PasswordResetUnavailableError);

    expect(transaction.user.update).not.toHaveBeenCalled();
  });
});
