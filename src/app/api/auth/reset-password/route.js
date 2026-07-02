import { NextResponse } from 'next/server';

export async function POST() {
    return NextResponse.json(
        { message: 'Funcionalidade em manutenção. Tente novamente mais tarde.' },
        { status: 503 }
    );
}
