import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req) {
    try {
        const body = await req.json();
        const { name, email, password, role } = body;

        if (!email || !password) {
            return NextResponse.json(
                { message: 'Missing fields' },
                { status: 400 }
            );
        }

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { message: 'User already exists' },
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

        // Remove password from response
        const { password_hash, ...userWithoutPassword } = newUser;

        return NextResponse.json(userWithoutPassword, { status: 201 });
    } catch (error) {
        console.error('Registration Error:', error);
        return NextResponse.json(
            { message: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
