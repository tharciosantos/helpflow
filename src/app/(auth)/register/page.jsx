"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const router = useRouter();
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md rounded-lg bg-white/10 border border-white/20 p-8 shadow-lg">
        <div className="text-center mb-8">
          <Image
            src="/favicon.ico"
            alt="HelpFlow Logo"
            width={64}
            height={64}
            className="mx-auto mb-4"
            priority
          />
          <h1 className="text-4xl font-bold text-white mb-2">Criar Conta</h1>
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-md bg-red-100 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="register-name" className="mb-1 block text-sm font-medium text-gray-200">
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
              className="w-full rounded-md border border-white/20 bg-slate-900/40 px-4 py-2 text-white placeholder-gray-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
              placeholder="Seu nome"
              required
              minLength={2}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? 'register-name-error' : undefined}
            />
            {fieldErrors.name && <p id="register-name-error" className="mt-1 text-sm text-red-300">{fieldErrors.name[0]}</p>}
          </div>

          <div>
            <label htmlFor="register-email" className="mb-1 block text-sm font-medium text-gray-200">
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
              className="w-full rounded-md border border-white/20 bg-slate-900/40 px-4 py-2 text-white placeholder-gray-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
              placeholder="voce@exemplo.com"
              required
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
            />
            {fieldErrors.email && <p id="register-email-error" className="mt-1 text-sm text-red-300">{fieldErrors.email[0]}</p>}
          </div>

          <div>
            <label htmlFor="register-password" className="mb-1 block text-sm font-medium text-gray-200">
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
              className="w-full rounded-md border border-white/20 bg-slate-900/40 px-4 py-2 text-white placeholder-gray-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
              placeholder="••••••••"
              required
              minLength={8}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'register-password-help register-password-error' : 'register-password-help'}
            />
            <p id="register-password-help" className="mt-1 text-xs text-gray-400">Use pelo menos 8 caracteres.</p>
            {fieldErrors.password && <p id="register-password-error" className="mt-1 text-sm text-red-300">{fieldErrors.password[0]}</p>}
          </div>

          <div>
            <label htmlFor="register-confirm-password" className="mb-1 block text-sm font-medium text-gray-200">
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
              className="w-full rounded-md border border-white/20 bg-slate-900/40 px-4 py-2 text-white placeholder-gray-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
              placeholder="••••••••"
              required
              minLength={8}
              aria-invalid={Boolean(fieldErrors.confirmPassword)}
              aria-describedby={fieldErrors.confirmPassword ? 'register-confirm-password-error' : undefined}
            />
            {fieldErrors.confirmPassword && <p id="register-confirm-password-error" className="mt-1 text-sm text-red-300">{fieldErrors.confirmPassword[0]}</p>}
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

        <p className="mt-6 text-center text-sm text-gray-300">
          Já tem uma conta?{" "}
          <Link
            data-cy="register-login-link"
            href="/login"
            className="font-medium text-teal-400 hover:text-teal-300"
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
