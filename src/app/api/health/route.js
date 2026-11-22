import prisma from "@/lib/prisma";
import { checkDatabase, DB_PING_TIMEOUT_MS } from "@/lib/healthCheck";

// A rota precisa responder dentro do prazo do ping (AUD-39).
export const dynamic = "force-dynamic";
export const maxDuration = 5;

export async function GET() {
    const result = await checkDatabase(() => prisma.$queryRaw`SELECT 1`, {
        timeoutMs: DB_PING_TIMEOUT_MS,
    });

    if (result.ok) {
        return Response.json({ status: "ok", db: "connected" });
    }

    // O detalhe fica no log do servidor; o corpo não expõe o estado interno.
    console.error(`[Health Check] Banco indisponível (${result.reason}):`, result.error?.message);

    return Response.json(
        {
            status: "error",
            message: result.reason === "TIMEOUT"
                ? "Banco de dados não respondeu a tempo"
                : "Erro interno no health check",
        },
        { status: 503 },
    );
}
