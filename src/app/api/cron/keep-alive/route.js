import prisma from '@/lib/prisma';
import { isCronAuthorized } from '@/lib/cronAuth';

/**
 * Rota de keep-alive para prevenir que o Supabase entre em pausa.
 * Esta rota é chamada periodicamente pelo Vercel Cron Job (vercel.json).
 */
export async function GET(request) {
    // Verifica se a requisição vem do Cron do Vercel (segurança).
    // Sem CRON_SECRET configurado a rota falha fechada (401).
    const authorized = isCronAuthorized({
        authHeader: request.headers.get('authorization'),
        secret: process.env.CRON_SECRET,
    });

    if (!authorized) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        await prisma.$queryRaw`SELECT 1`;

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
    }
}
