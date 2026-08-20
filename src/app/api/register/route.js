import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import { registerSchema, registerCompanySchema, registerEmployeeSchema, generateCompanyCode } from '@/lib/schemas';
import { resolveRegistrationRole } from '@/lib/registrationRole';

export async function POST(req) {
    const ip = getClientIp(req);
    const { isLimited } = checkRateLimit(`register:${ip}`);

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
        const accountType = body.accountType || (body.companyName ? 'COMPANY' : (body.companyCode ? 'EMPLOYEE' : undefined));

        let validation;
        if (accountType === 'COMPANY') {
            validation = registerCompanySchema.safeParse(body);
        } else if (accountType === 'EMPLOYEE') {
            validation = registerEmployeeSchema.safeParse(body);
        } else {
            validation = registerSchema.safeParse(body);
        }

        if (!validation.success) {
            return NextResponse.json(
                { message: 'Dados inválidos.', errors: validation.error.flatten().fieldErrors },
                { status: 400 }
            );
        }

        const { name, email, password } = validation.data;
        const hashedPassword = await bcrypt.hash(password, 10);

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { message: 'Não foi possível criar a conta com os dados informados.', errors: { email: ['Este e-mail já está cadastrado.'] } },
                { status: 400 }
            );
        }

        // Fluxo 1: Cadastro de Funcionário (CLIENT vinculado por código)
        if (accountType === 'EMPLOYEE') {
            const cleanCode = validation.data.companyCode.trim().toUpperCase();
            const company = await prisma.company.findFirst({
                where: { code: { equals: cleanCode, mode: 'insensitive' } },
            });

            if (!company) {
                return NextResponse.json(
                    {
                        message: 'Código da empresa não encontrado.',
                        errors: { companyCode: ['Código não encontrado. Verifique com a TI/Suporte da sua empresa.'] },
                    },
                    { status: 400 }
                );
            }

            const newUser = await prisma.user.create({
                data: {
                    name,
                    email,
                    password_hash: hashedPassword,
                    auth_provider: 'credentials',
                    role: 'CLIENT',
                    companyId: company.id,
                },
            });

            return NextResponse.json(
                { id: newUser.id, name: newUser.name, email: newUser.email, role: 'CLIENT', companyName: company.name, companyCode: company.code },
                { status: 201 }
            );
        }

        // Fluxo 2: Cadastro de Empresa (AGENT / Suporte Corporativo)
        if (accountType === 'COMPANY') {
            let code = generateCompanyCode(validation.data.companyName);
            let attempts = 0;
            while (attempts < 5 && await prisma.company.findUnique({ where: { code } })) {
                code = generateCompanyCode(validation.data.companyName);
                attempts++;
            }

            const result = await prisma.$transaction(async (tx) => {
                const newCompany = await tx.company.create({
                    data: {
                        name: validation.data.companyName,
                        code,
                    },
                });

                const newUser = await tx.user.create({
                    data: {
                        name,
                        email,
                        password_hash: hashedPassword,
                        auth_provider: 'credentials',
                        role: 'AGENT',
                        companyId: newCompany.id,
                    },
                });

                return { newUser, newCompany };
            });

            return NextResponse.json(
                { id: result.newUser.id, name: result.newUser.name, email: result.newUser.email, role: 'AGENT', companyName: result.newCompany.name, companyCode: result.newCompany.code },
                { status: 201 }
            );
        }

        // Fluxo 3: Fallback padrão / testes (compatibilidade com suites de testes)
        const testSecret = req.headers.get('x-test-secret');
        const userRole = resolveRegistrationRole({
            requestedRole: body.role,
            testSecret,
            configuredTestSecret: process.env.CYPRESS_TEST_SECRET,
            environment: process.env.NODE_ENV,
        });

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
