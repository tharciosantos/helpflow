import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
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
        await prisma.$transaction([
            prisma.user.update({
                where: { id: passwordReset.userId },
                data: { password_hash: hashedPassword },
            }),
            prisma.passwordReset.update({
                where: { id: passwordReset.id },
                data: { used: true },
            }),
        ]);

        return NextResponse.json({ message: 'Senha redefinida com sucesso.' });

    } catch (error) {
        return NextResponse.json({ message: 'Erro interno do servidor.' }, { status: 500 });
    }
}