"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "@/app/components/ThemeProvider";
import ThemeToggle from "@/app/components/ThemeToggle";

export default function ForgotPasswordPage() {
    const { theme } = useTheme();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || "Erro ao processar solicitação.");
            } else {
                setSuccess(true);
            }
        } catch (err) {
            setError("Erro de conexão. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <main className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden ${
                theme === "light"
                    ? "bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50"
                    : "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
            }`}>
                <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
                    <ThemeToggle />
                </div>
                <div className="relative w-full max-w-md">
                    <div className={`backdrop-blur-xl border rounded-2xl shadow-2xl p-8 ${
                        theme === "light"
                            ? "bg-white/80 border-slate-200"
                            : "bg-white/10 border-white/20"
                    }`}>
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h1 className={`text-2xl font-bold mb-2 ${
                                theme === "light" ? "text-slate-900" : "text-white"
                            }`}>Email enviado!</h1>
                            <p className={theme === "light" ? "text-slate-600" : "text-gray-400"}>
                                Se o email <strong className={theme === "light" ? "text-slate-900" : "text-white"}>{email}</strong> estiver cadastrado,
                                você receberá um link para redefinir sua senha.
                            </p>
                        </div>

                        <div className={`border rounded-lg p-4 mb-6 ${
                            theme === "light" ? "bg-slate-50 border-slate-200" : "bg-white/5 border-white/10"
                        }`}>
                            <p className={`text-sm ${theme === "light" ? "text-slate-700" : "text-gray-300"}`}>
                                <strong>Próximos passos:</strong>
                            </p>
                            <ol className={`text-sm mt-2 space-y-1 list-decimal list-inside ${
                                theme === "light" ? "text-slate-600" : "text-gray-300"
                            }`}>
                                <li>Verifique sua caixa de entrada</li>
                                <li>Clique no link no email</li>
                                <li>Crie uma nova senha</li>
                            </ol>
                            <p className={`text-xs mt-3 ${theme === "light" ? "text-slate-400" : "text-gray-500"}`}>
                                O link expira em 15 minutos por segurança.
                            </p>
                        </div>

                        <Link
                            href="/login"
                            className="block w-full text-center rounded-md bg-teal-500 px-4 py-2 font-semibold text-white transition hover:bg-teal-400"
                        >
                            Voltar para o Login
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden ${
            theme === "light"
                ? "bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50"
                : "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
        }`}>
            <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
                <ThemeToggle />
            </div>

            <div className="absolute inset-0 pointer-events-none">
                <div className={`absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl ${
                    theme === "light" ? "bg-teal-200/30" : "bg-teal-500/10"
                }`} />
                <div className={`absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl ${
                    theme === "light" ? "bg-blue-200/30" : "bg-blue-500/10"
                }`} />
            </div>

            <div className="relative w-full max-w-md">
                <div className={`backdrop-blur-xl border rounded-2xl shadow-2xl p-8 ${
                    theme === "light"
                        ? "bg-white/80 border-slate-200"
                        : "bg-white/10 border-white/20"
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
                        }`}>Esqueci minha senha</h1>
                        <p className={theme === "light" ? "text-slate-600" : "text-gray-400"}>
                            Digite seu email para receber um link de recuperação
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
                            <label htmlFor="forgot-email" className={`mb-1 block text-sm font-medium ${
                                theme === "light" ? "text-slate-700" : "text-gray-200"
                            }`}>
                                Email
                            </label>
                            <input
                                type="email"
                                id="forgot-email"
                                name="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={`w-full rounded-md border px-4 py-2 focus:outline-none focus:ring-1 focus:ring-teal-400 ${
                                    theme === "light"
                                        ? "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-teal-500"
                                        : "border-white/20 bg-slate-900/40 text-white placeholder-gray-400 focus:border-teal-400"
                                }`}
                                placeholder="voce@exemplo.com"
                                required
                                disabled={loading}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-md bg-teal-500 px-4 py-2 font-semibold text-white transition hover:bg-teal-400 disabled:bg-teal-700"
                        >
                            {loading ? "Enviando..." : "Enviar link de recuperação"}
                        </button>
                    </form>

                    <p className={`mt-6 text-center text-sm ${
                        theme === "light" ? "text-slate-600" : "text-gray-300"
                    }`}>
                        Lembrou sua senha?{" "}
                        <Link href="/login" className="font-medium text-teal-500 hover:text-teal-400">
                            Voltar para o login
                        </Link>
                    </p>
                </div>
            </div>
        </main>
    );
}
