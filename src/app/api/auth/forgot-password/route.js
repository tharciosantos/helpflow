import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';        // Gerar tokens seguros
import prisma from '@/lib/prisma';           // Cliente Prisma
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import { forgotPasswordSchema } from '@/lib/schemas';

/**
 * POST /api/auth/forgot-password
 * 
 * Fluxo:
 * 1. Valida email
 * 2. Rate limit
 * 3. Busca usuário
 * 4. Gera token
 * 5. Salva no banco
 * 6. Envia email (ou loga)
 * 7. Retorna mensagem genérica
 */
export async function POST(req) {
    try {
        // === 1. VALIDAR INPUT ===
        const body = await req.json();

        const validation = forgotPasswordSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { message: 'Dados inválidos.', errors: validation.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { email } = validation.data;

        // === 2. RATE LIMITING ===
        // Previne abuso: no máximo 5 tentativas por 15 minutos por IP
        const ip = getClientIp(req);
        const { isLimited } = checkRateLimit(`forgot-password:${ip}`);

        if (isLimited) {
            return NextResponse.json(
                { message: 'Muitas tentativas. Tente novamente em 15 minutos.' },
                { status: 429 }
            );
        }

        // === 3. BUSCAR USUÁRIO ===
        const user = await prisma.user.findUnique({
            where: { email },
        });

        // === 4. MENSAGEM GENÉRICA (IMPORTANTE!) ===
        // NUNCA diga "email não encontrado" - isso revela quais emails existem
        // Sempre retorne a mesma mensagem, independente do resultado
        if (!user) {
            return NextResponse.json({
                message: 'Se o email estiver cadastrado, você receberá um link de recuperação.',
            });
        }

        // === 5. GERAR TOKEN SEGURO ===
        // randomBytes(32) = 32 bytes = 256 bits de entropia
        // toString('hex') = converte para string hexadecimal (64 caracteres)
        const token = randomBytes(32).toString('hex');

        // === 6. DEFINIR EXPIRAÇÃO ===
        // Token expira em 15 minutos
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        // === 7. SALVAR NO BANCO ===
        // Deletar tokens antigos deste usuário (opcional, mas bom)
        await prisma.passwordReset.deleteMany({
            where: {
                userId: user.id,
                used: false,
            },
        });

        // Criar novo token
        await prisma.passwordReset.create({
            data: {
                token,
                userId: user.id,
                expiresAt,
            },
        });

        // === 8. ENVIAR EMAIL (ou logar) ===
        const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

        // Por enquanto, apenas logar no console (para desenvolvimento)
        console.log('========================================');
        console.log('🔗 LINK DE RECUPERAÇÃO DE SENHA:');
        console.log(resetUrl);
        console.log('========================================');
        console.log(`Usuário: ${user.email}`);
        console.log(`Expira em: ${expiresAt.toLocaleString('pt-BR')}`);
        console.log('========================================');

        // Em produção, aqui você enviaria o email:
        // await sendResetEmail(user.email, resetUrl);

        // === 9. RETORNAR MENSAGEM GENÉRICA ===
        // Mesma mensagem para email existente ou não
        return NextResponse.json({
            message: 'Se o email estiver cadastrado, você receberá um link de recuperação.',
        });

    } catch (error) {
        console.error('Erro ao processar solicitação de reset:', error);
        return NextResponse.json(
            { message: 'Erro interno do servidor.' },
            { status: 500 }
        );
    }
}