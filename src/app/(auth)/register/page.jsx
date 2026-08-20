"use client";

import { Suspense, useRef, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { LuBuilding2, LuUserCheck } from "react-icons/lu";
import { useTheme } from "@/app/components/ThemeProvider";
import ThemeToggle from "@/app/components/ThemeToggle";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();

  const queryCode = searchParams.get("companyCode") || searchParams.get("empresa") || searchParams.get("code") || "";
  const [accountType, setAccountType] = useState(queryCode ? "EMPLOYEE" : "COMPANY");

  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyCode, setCompanyCode] = useState(queryCode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (queryCode) {
      setCompanyCode(queryCode);
      setAccountType("EMPLOYEE");
    }
  }, [queryCode]);

  const fields = {
    name: useRef(null),
    companyName: useRef(null),
    companyCode: useRef(null),
    email: useRef(null),
    password: useRef(null),
    confirmPassword: useRef(null),
  };

  const handleTabChange = (type) => {
    setAccountType(type);
    setError("");
    setFieldErrors({});
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

    const payload = {
      accountType,
      name,
      email,
      password,
      confirmPassword,
      ...(accountType === "COMPANY" ? { companyName } : { companyCode: companyCode.trim().toUpperCase() }),
    };

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const errors = data?.errors || {};
        setFieldErrors(errors);
        setError(data?.message || "Erro ao criar conta.");
        const firstInvalid = ["name", "companyName", "companyCode", "email", "password", "confirmPassword"].find(
          (key) => errors[key]?.length
        );
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
    <div className="relative w-full max-w-lg">
      <div
        className={`backdrop-blur-xl border rounded-2xl shadow-xl p-6 sm:p-8 ${
          theme === "light" ? "bg-white border-slate-200" : "bg-slate-900/90 border-slate-800"
        }`}
      >
        <div className="text-center mb-6">
          <Image
            src="/favicon.ico"
            alt="HelpFlow Logo"
            width={56}
            height={56}
            className="mx-auto mb-3"
            priority
          />
          <h1
            className={`text-2xl sm:text-3xl font-bold tracking-tight mb-1.5 ${
              theme === "light" ? "text-slate-900" : "text-white"
            }`}
          >
            Criar Conta no HelpFlow
          </h1>
          <p className={`text-sm ${theme === "light" ? "text-slate-600" : "text-slate-400"}`}>
            Escolha como você deseja acessar o sistema corporativo
          </p>
        </div>

        {/* Seletor de Perfil (Empresa vs Funcionário) */}
        <div
          className={`grid grid-cols-2 gap-1.5 p-1.5 rounded-xl border mb-6 ${
            theme === "light" ? "bg-slate-100 border-slate-200" : "bg-slate-950 border-slate-800"
          }`}
        >
          <button
            type="button"
            data-cy="tab-register-company"
            onClick={() => handleTabChange("COMPANY")}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              accountType === "COMPANY"
                ? "bg-emerald-600 text-white shadow-xs"
                : theme === "light"
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <LuBuilding2 size={16} />
            <span>Empresa / TI</span>
          </button>

          <button
            type="button"
            data-cy="tab-register-employee"
            onClick={() => handleTabChange("EMPLOYEE")}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              accountType === "EMPLOYEE"
                ? "bg-emerald-600 text-white shadow-xs"
                : theme === "light"
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <LuUserCheck size={16} />
            <span>Funcionário</span>
          </button>
        </div>

        {/* Mensagem explicativa da aba */}
        <div
          className={`rounded-xl border p-3.5 mb-5 text-xs ${
            theme === "light" ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-slate-950/60 border-slate-800 text-slate-300"
          }`}
        >
          {accountType === "COMPANY" ? (
            <p>
              🏢 <strong>Conta Empresa (Atendimento / TI)</strong>: Crie o espaço de atendimento da sua organização e atenda aos chamados dos seus colaboradores.
            </p>
          ) : (
            <p>
              👤 <strong>Conta Funcionário (Colaborador)</strong>: Abra e acompanhe chamados técnicos internos com total privacidade na sua empresa.
            </p>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className={`mb-4 rounded-lg p-3 text-sm border ${
              theme === "light"
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-red-500/20 border-red-500/50 text-red-200"
            }`}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Nome da Empresa (apenas se COMPANY) */}
          {accountType === "COMPANY" && (
            <div>
              <label
                htmlFor="register-company-name"
                className={`mb-1 block text-xs font-semibold uppercase tracking-wider ${
                  theme === "light" ? "text-slate-700" : "text-slate-200"
                }`}
              >
                Nome da Empresa / Organização
              </label>
              <input
                data-cy="register-company-name"
                type="text"
                id="register-company-name"
                name="companyName"
                ref={fields.companyName}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className={`w-full rounded-lg border px-3.5 py-2 text-sm focus:outline-none focus:ring-2 ${
                  theme === "light"
                    ? "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-emerald-400/20"
                    : "border-slate-700 bg-slate-950/60 text-white placeholder-slate-500 focus:border-emerald-400 focus:ring-emerald-400/20"
                }`}
                placeholder="Ex: Tech Corp Solutions"
                required
                minLength={2}
                maxLength={80}
                aria-invalid={Boolean(fieldErrors.companyName)}
              />
              {fieldErrors.companyName && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.companyName[0]}</p>
              )}
            </div>
          )}

          {/* Código da Empresa (apenas se EMPLOYEE) */}
          {accountType === "EMPLOYEE" && (
            <div>
              <label
                htmlFor="register-company-code"
                className={`mb-1 block text-xs font-semibold uppercase tracking-wider ${
                  theme === "light" ? "text-slate-700" : "text-slate-200"
                }`}
              >
                Código da Empresa
              </label>
              <input
                data-cy="register-company-code"
                type="text"
                id="register-company-code"
                name="companyCode"
                ref={fields.companyCode}
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                className={`w-full rounded-lg border px-3.5 py-2 font-mono text-sm uppercase focus:outline-none focus:ring-2 ${
                  theme === "light"
                    ? "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-emerald-400/20"
                    : "border-slate-700 bg-slate-950/60 text-white placeholder-slate-500 focus:border-emerald-400 focus:ring-emerald-400/20"
                }`}
                placeholder="Ex: TECH-4821"
                required
                minLength={3}
                aria-invalid={Boolean(fieldErrors.companyCode)}
              />
              <p className={`mt-1 text-[11px] ${theme === "light" ? "text-slate-500" : "text-slate-400"}`}>
                Solicite o código à equipe de TI / Suporte da sua empresa.
              </p>
              {fieldErrors.companyCode && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.companyCode[0]}</p>
              )}
            </div>
          )}

          <div>
            <label
              htmlFor="register-name"
              className={`mb-1 block text-xs font-semibold uppercase tracking-wider ${
                theme === "light" ? "text-slate-700" : "text-slate-200"
              }`}
            >
              {accountType === "COMPANY" ? "Nome do Responsável / Administrador" : "Seu Nome Completo"}
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
              className={`w-full rounded-lg border px-3.5 py-2 text-sm focus:outline-none focus:ring-2 ${
                theme === "light"
                  ? "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-emerald-400/20"
                  : "border-slate-700 bg-slate-950/60 text-white placeholder-slate-500 focus:border-emerald-400 focus:ring-emerald-400/20"
              }`}
              placeholder="Seu nome"
              required
              minLength={2}
              aria-invalid={Boolean(fieldErrors.name)}
            />
            {fieldErrors.name && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.name[0]}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="register-email"
              className={`mb-1 block text-xs font-semibold uppercase tracking-wider ${
                theme === "light" ? "text-slate-700" : "text-slate-200"
              }`}
            >
              Email {accountType === "COMPANY" ? "Corporativo" : ""}
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
              className={`w-full rounded-lg border px-3.5 py-2 text-sm focus:outline-none focus:ring-2 ${
                theme === "light"
                  ? "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-emerald-400/20"
                  : "border-slate-700 bg-slate-950/60 text-white placeholder-slate-500 focus:border-emerald-400 focus:ring-emerald-400/20"
              }`}
              placeholder="voce@empresa.com"
              required
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.email[0]}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="register-password"
              className={`mb-1 block text-xs font-semibold uppercase tracking-wider ${
                theme === "light" ? "text-slate-700" : "text-slate-200"
              }`}
            >
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
              className={`w-full rounded-lg border px-3.5 py-2 text-sm focus:outline-none focus:ring-2 ${
                theme === "light"
                  ? "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-emerald-400/20"
                  : "border-slate-700 bg-slate-950/60 text-white placeholder-slate-500 focus:border-emerald-400 focus:ring-emerald-400/20"
              }`}
              placeholder="••••••••"
              required
              minLength={8}
              aria-invalid={Boolean(fieldErrors.password)}
            />
            <p className={`mt-1 text-[11px] ${theme === "light" ? "text-slate-400" : "text-slate-500"}`}>
              Use no mínimo 8 caracteres.
            </p>
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.password[0]}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="register-confirm-password"
              className={`mb-1 block text-xs font-semibold uppercase tracking-wider ${
                theme === "light" ? "text-slate-700" : "text-slate-200"
              }`}
            >
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
              className={`w-full rounded-lg border px-3.5 py-2 text-sm focus:outline-none focus:ring-2 ${
                theme === "light"
                  ? "border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-emerald-400/20"
                  : "border-slate-700 bg-slate-950/60 text-white placeholder-slate-500 focus:border-emerald-400 focus:ring-emerald-400/20"
              }`}
              placeholder="••••••••"
              required
              minLength={8}
              aria-invalid={Boolean(fieldErrors.confirmPassword)}
            />
            {fieldErrors.confirmPassword && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.confirmPassword[0]}</p>
            )}
          </div>

          <button
            data-cy="register-submit"
            type="submit"
            disabled={loading}
            className="w-full mt-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 font-semibold text-sm transition shadow-xs disabled:opacity-50 active:scale-[0.99]"
          >
            {loading ? "Criando conta..." : accountType === "COMPANY" ? "Criar Espaço da Empresa" : "Cadastrar como Funcionário"}
          </button>
        </form>

        <p className={`mt-6 text-center text-sm ${theme === "light" ? "text-slate-600" : "text-slate-400"}`}>
          Já tem uma conta?{" "}
          <Link
            data-cy="register-login-link"
            href="/login"
            className="font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 underline"
          >
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const { theme } = useTheme();

  return (
    <main
      className={`relative min-h-screen flex items-center justify-center p-4 transition-colors ${
        theme === "light" ? "bg-slate-50" : "bg-slate-950"
      }`}
    >
      {/* Theme Toggle */}
      <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      {/* Background subtle radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-3xl ${
            theme === "light" ? "bg-emerald-500/5" : "bg-emerald-600/10"
          }`}
        />
      </div>

      <Suspense fallback={<div className="text-sm text-slate-500">Carregando formulário...</div>}>
        <RegisterForm />
      </Suspense>
    </main>
  );
}
