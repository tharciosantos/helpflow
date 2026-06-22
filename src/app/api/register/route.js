import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import { registerSchema } from '@/lib/schemas';


export async function POST(req) {

    const ip = getClientIp(req);
    const { isLimited, remaining } = checkRateLimit(`register:${ip}`);

    if (isLimited) {
        return NextResponse.json(
            { message: 'Muitas tentativas. Tente novamente em 15 minutos.' },
            {
                status: 429,
                headers: {
                    'X-RateLimit-Remaining': '0',
                    'Retry-After': '900',
                },
            }
        );
    }

    try {
        const body = await req.json();

        // Validação com Zod — mesma fonte de verdade que o restante das rotas
        const validation = registerSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { message: 'Dados inválidos.', errors: validation.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { name, email, password } = validation.data;
        // role vem fora do schema (exclusivo para testes via x-test-secret)
        const { role } = body;

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { message: 'Este email já está em uso.' },
                { status: 409 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Permite definir role apenas em ambiente de testes (protegido por secret)
        const testSecret = req.headers.get('x-test-secret');
        const isTestEnv = testSecret === process.env.CYPRESS_TEST_SECRET && process.env.CYPRESS_TEST_SECRET;
        const userRole = isTestEnv && role === 'AGENT' ? 'AGENT' : 'CLIENT';

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password_hash: hashedPassword,
                auth_provider: 'credentials',
                role: userRole,
            },
        });

        return NextResponse.json({ id: newUser.id, name: newUser.name, email: newUser.email }, { status: 201 });
    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        return NextResponse.json(
            { message: 'Erro interno do servidor.' },
            { status: 500 }
        );
    }
}
