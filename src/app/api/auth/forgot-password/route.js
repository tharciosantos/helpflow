import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import prisma from '@/lib/prisma';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import { forgotPasswordSchema } from '@/lib/schemas';
// 1. Importamos a nossa função de disparo de e-mail
import { sendResetPasswordEmail } from '@/lib/email';

export async function POST(req) {
    try {
        const body = await req.json();
        const validation = forgotPasswordSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { message: 'Dados inválidos.', errors: validation.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { email } = validation.data;
        const ip = getClientIp(req);
        const { isLimited } = checkRateLimit(`forgot-password:${ip}`);

        if (isLimited) {
            return NextResponse.json(
                { message: 'Muitas tentativas. Tente novamente em 15 minutos.' },
                { status: 429 }
            );
        }

        const user = await prisma.user.findUnique({ where: { email } });

        // Mensagem genérica por segurança (enumerations)
        if (!user) {
            return NextResponse.json({
                message: 'Se o email estiver cadastrado, você receberá um link de recuperação.',
            });
        }

        // Gerar token seguro (256 bits de entropia) e expiração de 15 min
        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        // Limpar tokens antigos e criar o novo
        await prisma.passwordReset.deleteMany({
            where: { userId: user.id, used: false },
        });

        await prisma.passwordReset.create({
            data: { token, userId: user.id, expiresAt },
        });

        const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

        // 2. Substituímos o console.log pelo envio real do e-mail via Nodemailer
        const emailResult = await sendResetPasswordEmail(user.email, resetUrl);

        if (!emailResult.success) {
            console.error('Falha interna ao disparar o e-mail:', emailResult.error);
            // Nota: mesmo se falhar internamente, não vamos avisar o usuário por questões de segurança
        }

        return NextResponse.json({
            message: 'Se o email estiver cadastrado, você receberá um link de recuperação.',
        });

    } catch (error) {
        console.error('Erro na rota de recuperação de senha:', error);
        return NextResponse.json({ message: 'Erro interno do servidor.' }, { status: 500 });
    }
}