import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import {
    PasswordResetUnavailableError,
    updatePasswordWithResetToken,
} from '@/lib/passwordReset';
import { resetPasswordSchema } from '@/lib/schemas';

export async function POST(req) {
    try {
        const body = await req.json();
        const validation = resetPasswordSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { message: 'Dados inválidos.', errors: validation.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { token, password } = validation.data;

        const passwordReset = await prisma.passwordReset.findUnique({
            where: { token },
            include: { user: true },
        });

        if (!passwordReset) {
            return NextResponse.json({ message: 'Token inválido ou expirado.' }, { status: 400 });
        }
        if (passwordReset.used) {
            return NextResponse.json({ message: 'Este token já foi utilizado. Solicite um novo.' }, { status: 400 });
        }
        if (new Date() > passwordReset.expiresAt) {
            return NextResponse.json({ message: 'Token expirado. Solicite um novo.' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Transação garante que ambas as operações ocorram juntas
        await updatePasswordWithResetToken({
            prisma,
            passwordReset,
            hashedPassword,
        });

        return NextResponse.json({ message: 'Senha redefinida com sucesso.' });

    } catch (error) {
        if (error instanceof PasswordResetUnavailableError) {
            return NextResponse.json(
                { message: 'Este token já foi utilizado ou expirou. Solicite um novo.' },
                { status: 400 }
            );
        }

        return NextResponse.json({ message: 'Erro interno do servidor.' }, { status: 500 });
    }
}
