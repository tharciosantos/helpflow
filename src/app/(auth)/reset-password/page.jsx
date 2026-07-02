"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // === PEGAR TOKEN DA URL ===
    // URL: /reset-password?token=abc123...
    const token = searchParams.get("token");

    // === ESTADOS ===
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [tokenError, setTokenError] = useState(false);

    // === VERIFICAR TOKEN AO CARREGAR ===
    useEffect(() => {
        // Se não tem token na URL, mostrar erro
        if (!token) {
            setTokenError(true);
        }
    }, [token]);

    // === HANDLER DO FORMULÁRIO ===
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        // Validação client-side (antes de enviar)
        if (password !== confirmPassword) {
            setError("As senhas não coincidem.");
            setLoading(false);
            return;
        }

        if (password.length < 8) {
            setError("A senha deve ter pelo menos 8 caracteres.");
            setLoading(false);
            return;
        }

        try {
            // === CHAMADA À API ===
            const response = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password, confirmPassword }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || "Erro ao redefinir senha.");
            } else {
                setSuccess(true);
                // Redirecionar para login após 3 segundos
                setTimeout(() => {
                    router.push("/login");
                }, 3000);
            }
        } catch (err) {
            setError("Erro de conexão. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    // === TELA DE ERRO: TOKEN INVÁLIDO ===
    if (tokenError) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="relative w-full max-w-md">
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-2">Link inválido</h1>
                            <p className="text-gray-400 mb-6">
                                Este link de recuperação é inválido ou está incompleto.
                            </p>
                            <Link
                                href="/forgot-password"
                                className="block w-full text-center rounded-md bg-teal-500 px-4 py-2 font-semibold text-white transition hover:bg-teal-400"
                            >
                                Solicitar novo link
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    // === TELA DE SUCESSO ===
    if (success) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="relative w-full max-w-md">
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-2">Senha redefinida!</h1>
                            <p className="text-gray-400">
                                Sua senha foi atualizada com sucesso.
                            </p>
                            <p className="text-gray-500 text-sm mt-2">
                                Redirecionando para o login...
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    // === FORMULÁRIO ===
    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <Image
                            src="/favicon.ico"
                            alt="HelpFlow Logo"
                            width={64}
                            height={64}
                            className="mx-auto mb-4"
                            priority
                        />
                        <h1 className="text-3xl font-bold text-white mb-2">Nova senha</h1>
                        <p className="text-gray-400">
                            Digite sua nova senha abaixo
                        </p>
                    </div>

                    {/* Erro */}
                    {error && (
                        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
                            <p className="text-red-200 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Formulário */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-200">
                                Nova senha
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-md border border-white/20 bg-slate-900/40 px-4 py-2 text-white placeholder-gray-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
                                placeholder="••••••••"
                                required
                                disabled={loading}
                                minLength={8}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Mínimo de 8 caracteres
                            </p>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-200">
                                Confirmar senha
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full rounded-md border border-white/20 bg-slate-900/40 px-4 py-2 text-white placeholder-gray-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
                                placeholder="••••••••"
                                required
                                disabled={loading}
                                minLength={8}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-md bg-teal-500 px-4 py-2 font-semibold text-white transition hover:bg-teal-400 disabled:bg-teal-700"
                        >
                            {loading ? "Redefinindo..." : "Redefinir senha"}
                        </button>
                    </form>

                    {/* Link para voltar */}
                    <p className="mt-6 text-center text-sm text-gray-300">
                        <Link href="/login" className="font-medium text-teal-400 hover:text-teal-300">
                            Voltar para o login
                        </Link>
                    </p>
                </div>
            </div>
        </main>
    );
}