"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { FaGithub } from "react-icons/fa";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await signIn("credentials", {
                redirect: false,
                email,
                password,
            });

            if (res?.error) {
                    setError("E-mail ou senha inválidos.");
            } else {
                router.push("/dashboard");
                router.refresh();
            }
        } catch (err) {
            setError("Ocorreu um erro inesperado. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    const handleGitHubLogin = () => {
        signIn("github", { callbackUrl: "/dashboard" });
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background blobs */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
            </div>

            {/* Card */}
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
                        <h1 className="text-4xl font-bold text-white mb-2">HelpFlow</h1>
                        <p className="text-gray-400">Sistema de suporte simplificado</p>
                    </div>

                    {/* Description */}
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
                        <p className="text-sm text-gray-300 text-center">
                            Faça login com email ou GitHub para acessar o dashboard e gerenciar seus tickets.
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
                            <p className="text-red-200 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4 mb-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-200">
                                Email
                            </label>
                            <input
                                data-cy="login-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full rounded-md border border-white/20 bg-slate-900/40 px-4 py-2 text-white placeholder-gray-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
                                placeholder="voce@exemplo.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-200">
                                Senha
                            </label>
                            <input
                                data-cy="login-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-md border border-white/20 bg-slate-900/40 px-4 py-2 text-white placeholder-gray-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            data-cy="login-submit"
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-md bg-teal-500 px-4 py-2 font-semibold text-white transition hover:bg-teal-400 disabled:bg-teal-700"
                        >
                            {loading ? "Entrando..." : "Entrar"}
                        </button>
                    </form>

                    <div className="my-4 flex items-center">
                        <div className="flex-grow border-t border-white/10"></div>
                        <span className="mx-4 text-sm text-gray-400">OU</span>
                        <div className="flex-grow border-t border-white/10"></div>
                    </div>

                    <button
                        data-cy="login-github"
                        onClick={handleGitHubLogin}
                        className="flex w-full items-center justify-center gap-2 rounded-md border border-white/20 bg-slate-900/60 px-4 py-2 font-medium text-white transition hover:bg-slate-800"
                    >
                        <FaGithub className="text-xl" />
                        Continuar com GitHub
                    </button>

                    <p className="mt-6 text-center text-sm text-gray-300">
                        Não tem uma conta?{" "}
                        <Link href="/register" data-cy="login-register-link" className="font-medium text-teal-400 hover:text-teal-300">
                            Criar conta
                        </Link>
                    </p>
                </div>
            </div>
        </main>
    );
}
