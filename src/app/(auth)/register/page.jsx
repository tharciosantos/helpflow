"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useTheme } from "@/app/components/ThemeProvider";
import ThemeToggle from "@/app/components/ThemeToggle";

export default function RegisterPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const fields = {
    name: useRef(null),
    email: useRef(null),
    password: useRef(null),
    confirmPassword: useRef(null),
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: ["As senhas não coincidem."] });
      fields.confirmPassword.current?.focus();
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password, confirmPassword }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const errors = data?.errors || {};
        setFieldErrors(errors);
        setError(data?.message || "Erro ao criar conta.");
        const firstInvalid = ['name', 'email', 'password', 'confirmPassword'].find((key) => errors[key]?.length);
        fields[firstInvalid]?.current?.focus();
        return;
      }

      // Login automático após o cadastro
      const loginRes = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (loginRes?.error) {
        router.push("/login");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden ${
      theme === "light"
        ? "bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50"
        : "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
    }`}>
      {/* Theme Toggle */}
      <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      {/* Background blobs */}
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
            <h1 className={`text-4xl font-bold mb-2 ${
              theme === "light" ? "text-slate-900" : "text-white"
            }`}>Criar Conta</h1>
            <p className={theme === "light" ? "text-slate-600" : "text-gray-400"}>
              Cadastre-se para abrir e acompanhar seus tickets
            </p>
          </div>

          {error && (
            <div role="alert" className={`mb-4 rounded-md p-3 text-sm border ${
              theme === "light"
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-red-500/20 border-red-500/50 text-red-200"
            }`}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="register-name" className={`mb-1 block text-sm font-medium ${
                theme === "light" ? "text-slate-700" : "text-gray-200"
              }`}>
                Nome
              </label>
              <input
                data-cy="register-name"
                type="text"
                id="register-name"
                name="name"
                autoComplete="name"
                ref={fields.name}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full rounded-md border px-4 py-2 focus:outline-none focus:ring-1 focus:ring-teal-400 ${
                  theme === "light"
                    ? "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-teal-500"
                    : "border-white/20 bg-slate-900/40 text-white placeholder-gray-400 focus:border-teal-400"
                }`}
                placeholder="Seu nome"
                required
                minLength={2}
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? 'register-name-error' : undefined}
              />
              {fieldErrors.name && <p id="register-name-error" className="mt-1 text-sm text-red-500">{fieldErrors.name[0]}</p>}
            </div>

            <div>
              <label htmlFor="register-email" className={`mb-1 block text-sm font-medium ${
                theme === "light" ? "text-slate-700" : "text-gray-200"
              }`}>
                Email
              </label>
              <input
                data-cy="register-email"
                type="email"
                id="register-email"
                name="email"
                autoComplete="email"
                ref={fields.email}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full rounded-md border px-4 py-2 focus:outline-none focus:ring-1 focus:ring-teal-400 ${
                  theme === "light"
                    ? "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-teal-500"
                    : "border-white/20 bg-slate-900/40 text-white placeholder-gray-400 focus:border-teal-400"
                }`}
                placeholder="voce@exemplo.com"
                required
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
              />
              {fieldErrors.email && <p id="register-email-error" className="mt-1 text-sm text-red-500">{fieldErrors.email[0]}</p>}
            </div>

            <div>
              <label htmlFor="register-password" className={`mb-1 block text-sm font-medium ${
                theme === "light" ? "text-slate-700" : "text-gray-200"
              }`}>
                Senha
              </label>
              <input
                data-cy="register-password"
                type="password"
                id="register-password"
                name="password"
                autoComplete="new-password"
                ref={fields.password}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full rounded-md border px-4 py-2 focus:outline-none focus:ring-1 focus:ring-teal-400 ${
                  theme === "light"
                    ? "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-teal-500"
                    : "border-white/20 bg-slate-900/40 text-white placeholder-gray-400 focus:border-teal-400"
                }`}
                placeholder="••••••••"
                required
                minLength={8}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'register-password-help register-password-error' : 'register-password-help'}
              />
              <p id="register-password-help" className={`mt-1 text-xs ${theme === "light" ? "text-slate-400" : "text-gray-400"}`}>Use pelo menos 8 caracteres.</p>
              {fieldErrors.password && <p id="register-password-error" className="mt-1 text-sm text-red-500">{fieldErrors.password[0]}</p>}
            </div>

            <div>
              <label htmlFor="register-confirm-password" className={`mb-1 block text-sm font-medium ${
                theme === "light" ? "text-slate-700" : "text-gray-200"
              }`}>
                Confirmar senha
              </label>
              <input
                data-cy="register-confirm-password"
                type="password"
                id="register-confirm-password"
                name="confirmPassword"
                autoComplete="new-password"
                ref={fields.confirmPassword}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full rounded-md border px-4 py-2 focus:outline-none focus:ring-1 focus:ring-teal-400 ${
                  theme === "light"
                    ? "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-teal-500"
                    : "border-white/20 bg-slate-900/40 text-white placeholder-gray-400 focus:border-teal-400"
                }`}
                placeholder="••••••••"
                required
                minLength={8}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                aria-describedby={fieldErrors.confirmPassword ? 'register-confirm-password-error' : undefined}
              />
              {fieldErrors.confirmPassword && <p id="register-confirm-password-error" className="mt-1 text-sm text-red-500">{fieldErrors.confirmPassword[0]}</p>}
            </div>

            <button
              data-cy="register-submit"
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-teal-500 px-4 py-2 font-semibold text-white transition hover:bg-teal-400 disabled:bg-teal-700"
            >
              {loading ? "Criando conta..." : "Criar conta"}
            </button>
          </form>

          <p className={`mt-6 text-center text-sm ${
            theme === "light" ? "text-slate-600" : "text-gray-300"
          }`}>
            Já tem uma conta?{" "}
            <Link
              data-cy="register-login-link"
              href="/login"
              className="font-medium text-teal-500 hover:text-teal-400"
            >
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
