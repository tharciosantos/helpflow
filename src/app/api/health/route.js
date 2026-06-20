import prisma from "@/lib/prisma";

export async function GET() {
    try {
        await prisma.user.findFirst();
        return Response.json({ status: "ok", db: "connected" });
    } catch (error) {
        console.error('[Health Check] Erro ao verificar banco de dados:', error.message);
        return Response.json({
            status: "error",
            message: "Erro interno no health check",
        }, { status: 500 });
    }
}