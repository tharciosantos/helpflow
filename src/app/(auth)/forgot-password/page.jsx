"use client";  // Necessário para useState e useRouter

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function ForgotPasswordPage() {
    // === ESTADOS ===
    const [email, setEmail] = useState("");           // Email digitado
    const [loading, setLoading] = useState(false);    // Se está processando
    const [error, setError] = useState("");           // Mensagem de erro
    const [success, setSuccess] = useState(false);    // Se enviou com sucesso

    // === HANDLER DO FORMULÁRIO ===
    const handleSubmit = async (e) => {
        e.preventDefault();          // Previne reload da página
        setLoading(true);            // Mostra "Enviando..."
        setError("");                // Limpa erros anteriores

        try {
            // === CHAMADA À API ===
            const response = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Erro da API (400, 429, 500)
                setError(data.message || "Erro ao processar solicitação.");
            } else {
                // Sucesso - mostrar mensagem e esconder formulário
                setSuccess(true);
            }
        } catch (err) {
            // Erro de conexão
            setError("Erro de conexão. Tente novamente.");
        } finally {
            setLoading(false);  // Sempre desabilitar loading
        }
    };

    // === TELA DE SUCESSO ===
    // Se já enviou, mostrar mensagem de confirmação
    if (success) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="relative w-full max-w-md">
                    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8">
                        {/* Ícone de sucesso */}
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-2">Email enviado!</h1>
                            <p className="text-gray-400">
                                Se o email <strong className="text-white">{email}</strong> estiver cadastrado,
                                você receberá um link para redefinir sua senha.
                            </p>
                        </div>

                        {/* Instruções */}
                        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
                            <p className="text-sm text-gray-300">
                                <strong>Próximos passos:</strong>
                            </p>
                            <ol className="text-sm text-gray-300 mt-2 space-y-1 list-decimal list-inside">
                                <li>Verifique sua caixa de entrada</li>
                                <li>Clique no link no email</li>
                                <li>Crie uma nova senha</li>
                            </ol>
                            <p className="text-xs text-gray-500 mt-3">
                                O link expira em 15 minutos por segurança.
                            </p>
                        </div>

                        {/* Link para voltar */}
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

    // === FORMULÁRIO ===
    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background blobs (mesmo estilo do login) */}
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
                        <h1 className="text-3xl font-bold text-white mb-2">Esqueci minha senha</h1>
                        <p className="text-gray-400">
                            Digite seu email para receber um link de recuperação
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
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full rounded-md border border-white/20 bg-slate-900/40 px-4 py-2 text-white placeholder-gray-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
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

                    {/* Link para voltar */}
                    <p className="mt-6 text-center text-sm text-gray-300">
                        Lembrou sua senha?{" "}
                        <Link href="/login" className="font-medium text-teal-400 hover:text-teal-300">
                            Voltar para o login
                        </Link>
                    </p>
                </div>
            </div>
        </main>
    );
}