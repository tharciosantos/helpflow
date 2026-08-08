export class PasswordResetUnavailableError extends Error {}

export async function updatePasswordWithResetToken({
  prisma,
  passwordReset,
  hashedPassword,
  now = new Date(),
}) {
  await prisma.$transaction(async (transaction) => {
    const claimedReset = await transaction.passwordReset.updateMany({
      where: {
        id: passwordReset.id,
        used: false,
        expiresAt: { gt: now },
      },
      data: { used: true },
    });

    if (claimedReset.count !== 1) {
      throw new PasswordResetUnavailableError();
    }

    await transaction.user.update({
      where: { id: passwordReset.userId },
      data: { password_hash: hashedPassword },
    });
  });
}
