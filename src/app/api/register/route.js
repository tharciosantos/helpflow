import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { checkRateLimit, getClientIp, buildRateLimitHeaders } from '@/lib/rateLimiter';
import { registerSchema, registerCompanySchema, registerEmployeeSchema, registerAccountTypeSchema, generateCompanyCode } from '@/lib/schemas';
import { resolveRegistrationRole } from '@/lib/registrationRole';

export async function POST(req) {
    const ip = getClientIp(req);
    const { isLimited, remaining, resetTime } = await checkRateLimit(`register:${ip}`);

    if (isLimited) {
        return NextResponse.json(
            { message: 'Muitas tentativas. Tente novamente em 15 minutos.' },
            {
                status: 429,
                headers: buildRateLimitHeaders({ remaining, resetTime }),
            }
        );
    }

    try {
        const body = await req.json();
        // AUD-40: o tipo de conta é explícito. Se vier no corpo, só COMPANY ou
        // EMPLOYEE; a rota não adivinha mais pelo `companyName`/`companyCode`.
        let accountType;
        if (body.accountType !== undefined) {
            const parsedAccountType = registerAccountTypeSchema.safeParse(body.accountType);

            if (!parsedAccountType.success) {
                return NextResponse.json(
                    {
                        message: 'Tipo de conta inválido.',
                        errors: { accountType: parsedAccountType.error.issues.map((issue) => issue.message) },
                    },
                    { status: 400 }
                );
            }

            accountType = parsedAccountType.data;
        }

        let validation;
        if (accountType === 'COMPANY') {
            validation = registerCompanySchema.safeParse(body);
        } else if (accountType === 'EMPLOYEE') {
            validation = registerEmployeeSchema.safeParse(body);
        } else {
            validation = registerSchema.safeParse(body);
        }

        if (!validation.success) {
            // Campo de vínculo mandado com o tipo de conta errado: o `.strict()`
            // recusa como chave desconhecida; a mensagem explica o conflito.
            const unrecognized = validation.error.issues.find((issue) => issue.code === 'unrecognized_keys');
            const conflictingField = unrecognized?.keys.find((key) => ['companyName', 'companyCode'].includes(key));
            const fieldErrors = validation.error.flatten().fieldErrors;

            if (conflictingField) {
                fieldErrors[conflictingField] = [
                    `Este campo não combina com accountType: ${accountType}.`,
                ];
            }

            return NextResponse.json(
                {
                    message: conflictingField
                        ? `O campo ${conflictingField} não combina com accountType: ${accountType}.`
                        : 'Dados inválidos.',
                    errors: fieldErrors,
                },
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

        // Fluxo 1: Cadastro de Funcionário (CLIENT vinculado por código, PENDING)
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

            // AUD-37: conhecer o código não basta para entrar no tenant. A conta
            // nasce PENDING e só autentica depois que um AGENT da empresa aprova.
            const newUser = await prisma.user.create({
                data: {
                    name,
                    email,
                    password_hash: hashedPassword,
                    auth_provider: 'credentials',
                    role: 'CLIENT',
                    approvalStatus: 'PENDING',
                    companyId: company.id,
                },
            });

            return NextResponse.json(
                {
                    id: newUser.id,
                    name: newUser.name,
                    email: newUser.email,
                    role: 'CLIENT',
                    approvalStatus: newUser.approvalStatus,
                    companyName: company.name,
                    message: 'Conta criada. Aguarde a aprovação da TI/Suporte da sua empresa para entrar.',
                },
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
