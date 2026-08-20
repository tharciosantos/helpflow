"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "@/app/components/ThemeProvider";
import ThemeToggle from "@/app/components/ThemeToggle";

export default function ResetPasswordForm({ token }) {
    const router = useRouter();
    const { theme } = useTheme();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [tokenError, setTokenError] = useState(false);

    useEffect(() => {
        if (!token) {
            setTokenError(true);
        }
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

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

    if (tokenError) {
        return (
            <main className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden ${
                theme === "light"
                    ? "bg-slate-50"
                    : "bg-slate-950"
            }`}>
                <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
                    <ThemeToggle />
                </div>
                <div className="relative w-full max-w-md">
                    <div className={`backdrop-blur-xl border rounded-2xl shadow-xl p-8 ${
                        theme === "light"
                            ? "bg-white border-slate-200"
                            : "bg-slate-900/90 border-slate-800"
                    }`}>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h1 className={`text-2xl font-bold mb-2 ${
                                theme === "light" ? "text-slate-900" : "text-white"
                            }`}>Link inválido</h1>
                            <p className={`mb-6 ${theme === "light" ? "text-slate-600" : "text-slate-400"}`}>
                                Este link de recuperação é inválido ou está incompleto.
                            </p>
                            <Link
                                href="/forgot-password"
                                className="block w-full text-center rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 font-semibold text-white transition shadow-xs"
                            >
                                Solicitar novo link
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    if (success) {
        return (
            <main className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden ${
                theme === "light"
                    ? "bg-slate-50"
                    : "bg-slate-950"
            }`}>
                <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
                    <ThemeToggle />
                </div>
                <div className="relative w-full max-w-md">
                    <div className={`backdrop-blur-xl border rounded-2xl shadow-xl p-8 ${
                        theme === "light"
                            ? "bg-white border-slate-200"
                            : "bg-slate-900/90 border-slate-800"
                    }`}>
                        <div className="text-center">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h1 className={`text-2xl font-bold mb-2 ${
                                theme === "light" ? "text-slate-900" : "text-white"
                            }`}>Senha redefinida!</h1>
                            <p className={theme === "light" ? "text-slate-600" : "text-slate-400"}>
                                Sua senha foi atualizada com sucesso.
                            </p>
                            <p className={`text-sm mt-2 ${theme === "light" ? "text-slate-400" : "text-slate-500"}`}>
                                Redirecionando para o login...
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden ${
            theme === "light"
                ? "bg-slate-50"
                : "bg-slate-950"
        }`}>
            <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
                <ThemeToggle />
            </div>

            <div className="absolute inset-0 pointer-events-none">
                <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-3xl ${
                    theme === "light" ? "bg-emerald-500/5" : "bg-emerald-600/10"
                }`} />
            </div>

            <div className="relative w-full max-w-md">
                <div className={`backdrop-blur-xl border rounded-2xl shadow-xl p-8 ${
                    theme === "light"
                        ? "bg-white border-slate-200"
                        : "bg-slate-900/90 border-slate-800"
                }`}>
                    <div className="text-center mb-8">
                        <Image
                            src="/favicon.ico"
                            alt="HelpFlow Logo"
                            width={64}
                            height={64}
                            className="mx-auto mb-4"
                            priority
                        />
                        <h1 className={`text-3xl font-bold mb-2 ${
                            theme === "light" ? "text-slate-900" : "text-white"
                        }`}>Nova senha</h1>
                        <p className={theme === "light" ? "text-slate-600" : "text-slate-400"}>
                            Digite sua nova senha abaixo
                        </p>
                    </div>

                    {error && (
                        <div role="alert" className={`border rounded-lg p-3 mb-4 ${
                            theme === "light"
                                ? "bg-red-50 border-red-200 text-red-700"
                                : "bg-red-500/20 border-red-500/50 text-red-200"
                        }`}>
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="reset-password" className={`mb-1 block text-sm font-medium ${
                                theme === "light" ? "text-slate-700" : "text-slate-200"
                            }`}>
                                Nova senha
                            </label>
                            <input
                                type="password"
                                id="reset-password"
                                name="password"
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 ${
                                    theme === "light"
                                        ? "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-emerald-400/20"
                                        : "border-slate-700 bg-slate-950/60 text-white placeholder-slate-500 focus:border-emerald-400 focus:ring-emerald-400/20"
                                }`}
                                placeholder="••••••••"
                                required
                                disabled={loading}
                                minLength={8}
                            />
                            <p className={`text-xs mt-1 ${theme === "light" ? "text-slate-400" : "text-slate-500"}`}>
                                Mínimo de 8 caracteres
                            </p>
                        </div>

                        <div>
                            <label htmlFor="reset-confirm-password" className={`mb-1 block text-sm font-medium ${
                                theme === "light" ? "text-slate-700" : "text-slate-200"
                            }`}>
                                Confirmar senha
                            </label>
                            <input
                                type="password"
                                id="reset-confirm-password"
                                name="confirmPassword"
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 ${
                                    theme === "light"
                                        ? "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-emerald-400/20"
                                        : "border-slate-700 bg-slate-950/60 text-white placeholder-slate-500 focus:border-emerald-400 focus:ring-emerald-400/20"
                                }`}
                                placeholder="••••••••"
                                required
                                disabled={loading}
                                minLength={8}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 font-semibold text-white transition shadow-xs disabled:opacity-50"
                        >
                            {loading ? "Redefinindo..." : "Redefinir senha"}
                        </button>
                    </form>

                    <p className={`mt-6 text-center text-sm ${
                        theme === "light" ? "text-slate-600" : "text-slate-400"
                    }`}>
                        <Link href="/login" className="font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 underline">
                            Voltar para o login
                        </Link>
                    </p>
                </div>
            </div>
        </main>
    );
}
