"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { FaGithub } from "react-icons/fa";
import { useTheme } from "@/app/components/ThemeProvider";
import ThemeToggle from "@/app/components/ThemeToggle";

export default function LoginPage() {
    const router = useRouter();
    const { theme } = useTheme();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const DEMO_ACCOUNTS = {
        client: {
            email: "client.demo@helpflow.com",
            password: "Demo@123456",
        },
        agent: {
            email: "agent.demo@helpflow.com",
            password: "Demo@123456",
        },
    };

    const handleDemoLogin = async (type) => {
        const creds = DEMO_ACCOUNTS[type];
        if (!creds) return;
        setEmail(creds.email);
        setPassword(creds.password);
        setLoading(true);
        setError("");

        try {
            const res = await signIn("credentials", {
                redirect: false,
                email: creds.email,
                password: creds.password,
            });

            if (res?.error) {
                if (res.error.includes("Muitas tentativas")) {
                    setError(res.error);
                } else {
                    setError("E-mail ou senha da conta demo inválidos.");
                }
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
                if (res.error.includes("Muitas tentativas")) {
                    setError(res.error);
                } else {
                    setError("E-mail ou senha inválidos.");
                }
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
        <main className={`relative min-h-screen flex items-center justify-center p-4 transition-colors ${
            theme === "light" 
                ? "bg-slate-50" 
                : "bg-slate-950"
        }`}>
            {/* Theme Toggle */}
            <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
                <ThemeToggle />
            </div>

            {/* Background subtle radial glow */}
            <div className="absolute inset-0 pointer-events-none">
                <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-3xl ${
                    theme === "light" ? "bg-emerald-500/5" : "bg-emerald-600/10"
                }`} />
            </div>

            {/* Card */}
            <div className="relative w-full max-w-md">
                <div className={`backdrop-blur-xl border rounded-2xl shadow-xl p-8 ${
                    theme === "light"
                        ? "bg-white border-slate-200"
                        : "bg-slate-900/90 border-slate-800"
                }`}>
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
                        <h1 className={`text-3xl font-bold tracking-tight mb-2 ${
                            theme === "light" ? "text-slate-900" : "text-white"
                        }`}>HelpFlow</h1>
                        <p className={theme === "light" ? "text-slate-600" : "text-slate-400"}>
                            Sistema de suporte simplificado
                        </p>
                    </div>

                    {/* Description */}
                    <div className={`border rounded-lg p-4 mb-4 ${
                        theme === "light"
                            ? "bg-slate-50 border-slate-200"
                            : "bg-slate-950/40 border-slate-800"
                    }`}>
                        <p className={`text-sm text-center ${
                            theme === "light" ? "text-slate-600" : "text-slate-300"
                        }`}>
                            Faça login com email ou GitHub para acessar o dashboard e gerenciar seus tickets.
                        </p>
                    </div>

                    {/* Demo Quick Access */}
                    <div className={`border rounded-xl p-4 mb-6 ${
                        theme === "light"
                            ? "bg-slate-50 border-slate-200 shadow-xs"
                            : "bg-slate-950/60 border-slate-800 shadow-xs"
                    }`}>
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <span className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
                                theme === "light" ? "text-slate-900" : "text-white"
                            }`}>
                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Acesso de Demonstração (1-Clique)
                            </span>
                            <span className={`text-[11px] px-2 py-0.5 rounded font-mono font-medium ${
                                theme === "light" ? "bg-slate-200 text-slate-800" : "bg-slate-800 text-slate-300"
                            }`}>
                                RBAC
                            </span>
                        </div>
                        <p className={`text-xs mb-3 ${
                            theme === "light" ? "text-slate-600" : "text-slate-400"
                        }`}>
                            Explore as duas visões do sistema sem necessidade de cadastro:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => handleDemoLogin("client")}
                                className={`text-left p-2.5 rounded-lg border transition-all text-xs ${
                                    theme === "light"
                                        ? "bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 hover:shadow-xs text-slate-800"
                                        : "bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-100"
                                }`}
                            >
                                <span className={`flex items-center gap-1.5 font-semibold ${
                                    theme === "light" ? "text-slate-900" : "text-white"
                                }`}>
                                    <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                    <span>Funcionário (Colaborador)</span>
                                </span>
                                <span className="block text-[11px] opacity-75 mt-0.5">
                                    Abertura e histórico privado
                                </span>
                            </button>

                            <button
                                type="button"
                                disabled={loading}
                                onClick={() => handleDemoLogin("agent")}
                                className={`text-left p-2.5 rounded-lg border transition-all text-xs ${
                                    theme === "light"
                                        ? "bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 hover:shadow-xs text-slate-800"
                                        : "bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-100"
                                }`}
                            >
                                <span className={`flex items-center gap-1.5 font-semibold ${
                                    theme === "light" ? "text-slate-900" : "text-white"
                                }`}>
                                    <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    </svg>
                                    <span>Empresa / TI (Atendimento)</span>
                                </span>
                                <span className="block text-[11px] opacity-75 mt-0.5">
                                    Fila geral e resolução corporativa
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div role="alert" className={`border rounded-lg p-3 mb-4 ${
                            theme === "light"
                                ? "bg-red-50 border-red-300 text-red-700"
                                : "bg-red-500/20 border-red-500/50 text-red-200"
                        }`}>
                            <p className="text-sm">{error}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4 mb-4">
                        <div>
                            <label htmlFor="login-email" className={`mb-1 block text-sm font-medium ${
                                theme === "light" ? "text-slate-700" : "text-slate-200"
                            }`}>
                                Email
                            </label>
                            <input
                                data-cy="login-email"
                                type="email"
                                id="login-email"
                                name="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={`w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 ${
                                    theme === "light"
                                        ? "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-emerald-400/20"
                                        : "border-slate-700 bg-slate-950/60 text-white placeholder-slate-500 focus:border-emerald-400 focus:ring-emerald-400/20"
                                }`}
                                placeholder="voce@exemplo.com"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="login-password" className={`mb-1 block text-sm font-medium ${
                                theme === "light" ? "text-slate-700" : "text-slate-200"
                            }`}>
                                Senha
                            </label>
                            <input
                                data-cy="login-password"
                                type="password"
                                id="login-password"
                                name="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`w-full rounded-lg border px-4 py-2 text-sm focus:outline-none focus:ring-2 ${
                                    theme === "light"
                                        ? "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-emerald-400/20"
                                        : "border-slate-700 bg-slate-950/60 text-white placeholder-slate-500 focus:border-emerald-400 focus:ring-emerald-400/20"
                                }`}
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            data-cy="login-submit"
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 font-semibold text-sm transition shadow-xs disabled:opacity-50"
                        >
                            {loading ? "Entrando..." : "Entrar"}
                        </button>
                    </form>
                    <p className={`text-center text-sm mt-2 ${
                        theme === "light" ? "text-slate-600" : "text-slate-400"
                    }`}>
                        <Link href="/forgot-password" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 underline">
                            Esqueceu sua senha?
                        </Link>
                    </p>
                    <div className="my-4 flex items-center">
                        <div className={`flex-grow border-t ${
                            theme === "light" ? "border-slate-200" : "border-slate-800"
                        }`}></div>
                        <span className={`mx-4 text-xs font-semibold ${
                            theme === "light" ? "text-slate-400" : "text-slate-500"
                        }`}>OU</span>
                        <div className={`flex-grow border-t ${
                            theme === "light" ? "border-slate-200" : "border-slate-800"
                        }`}></div>
                    </div>

                    <button
                        type="button"
                        data-cy="login-github"
                        disabled={loading}
                        onClick={handleGitHubLogin}
                        className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                            theme === "light"
                                ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                                : "border-slate-700 bg-slate-900/60 text-white hover:bg-slate-800"
                        }`}
                    >
                        <FaGithub className="text-lg" />
                        Continuar com GitHub
                    </button>

                    <p className={`mt-6 text-center text-sm ${
                        theme === "light" ? "text-slate-600" : "text-slate-300"
                    }`}>
                        Não tem uma conta?{" "}
                        <Link href="/register" data-cy="login-register-link" className="font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 underline">
                            Criar conta
                        </Link>
                    </p>
                </div>
            </div>
        </main>
    );
}
