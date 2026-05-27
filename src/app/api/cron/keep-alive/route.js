import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Rota de keep-alive para prevenir que o Supabase entre em pausa
 * Esta rota será chamada periodicamente pelo Vercel Cron Job
 */
export async function GET(request) {
    // Verifica se a requisição vem do Cron do Vercel (segurança)
    const authHeader = request.headers.get('authorization');

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        await prisma.$queryRaw`SELECT 1`;

        console.log('[Keep-Alive] Database ping successful:', new Date().toISOString());

        return Response.json({
            success: true,
            message: 'Database keepalive successful',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[Keep-Alive] Database ping failed:', error);

        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
