"use client";

import DemoTicketFlow from "./components/DemoTicketFlow";
import ThemeToggle from "./components/ThemeToggle";
import FeatureCard from "./components/FeatureCard";
import { useTheme } from "./components/ThemeProvider";
import Link from "next/link";

export default function Home() {
  const { theme } = useTheme();
  
  return (
    <div className={`min-h-screen lg:h-screen lg:overflow-hidden flex flex-col justify-between ${
      theme === "light" 
        ? "bg-slate-50 text-slate-900" 
        : "bg-slate-950 text-slate-100"
    }`}>
      {/* Header com Logo, Badge de Demonstração e Theme Toggle */}
      <header className={`shrink-0 z-50 backdrop-blur-md transition-colors border-b px-4 py-2.5 sm:px-6 md:px-8 ${
        theme === "light"
          ? "bg-white/80 border-slate-200"
          : "bg-slate-950/80 border-slate-800"
      }`}>
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`text-xl font-bold tracking-tight ${
              theme === "light" ? "text-slate-900" : "text-white"
            }`}>
              Help<span className="text-emerald-600 dark:text-emerald-400">Flow</span>
            </span>
            <span className={`hidden sm:inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
              theme === "light"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-emerald-950/50 text-emerald-300 border-emerald-800/40"
            }`}>
              Demonstração Aberta
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                theme === "light"
                  ? "text-slate-600 hover:text-slate-950"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 text-sm font-semibold transition shadow-xs"
            >
              Criar Conta
            </Link>
            <div className="border-l pl-3 ml-1 border-slate-300 dark:border-slate-700">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content calibrado para caber em 100vh */}
      <main className="flex-1 flex flex-col justify-center px-4 py-3 sm:px-6 md:py-4 max-w-5xl mx-auto w-full">
        <section className="w-full space-y-4 md:space-y-6">
          {/* Hero Section */}
          <div className="grid items-center gap-6 md:gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-0.5 text-xs font-semibold border mb-2.5 ${
                theme === "light"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-emerald-950/50 text-emerald-300 border-emerald-800/40"
              }`}>
                <span>🚀</span> HelpFlow · Demonstração de Produto
              </div>

              <h1 className={`text-2xl sm:text-3xl md:text-4xl lg:text-[2.5rem] font-bold leading-tight tracking-tight ${
                theme === "light" ? "text-slate-900" : "text-white"
              }`}>
                Suporte organizado, com cada pessoa vendo e fazendo apenas o que precisa.
              </h1>

              <p className={`mt-2.5 max-w-xl text-sm sm:text-base leading-relaxed ${
                theme === "light" ? "text-slate-600" : "text-slate-300"
              }`}>
                Conheça os principais fluxos com dados fictícios criados na sua
                própria conta. Nenhuma credencial compartilhada ou dado real é
                exposto nesta demonstração.
              </p>

              <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <Link
                  href="/register"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-center text-sm font-semibold transition-all hover:shadow-md active:scale-[0.98]"
                >
                  Criar conta de demonstração
                </Link>

                <Link
                  href="/login"
                  className={`rounded-xl border px-5 py-2.5 text-center text-sm font-semibold transition-all hover:shadow-xs active:scale-[0.98] ${
                    theme === "light"
                      ? "border-slate-300 bg-white hover:border-slate-400 text-slate-800"
                      : "border-slate-700 bg-slate-900/60 hover:border-slate-600 text-slate-200"
                  }`}
                >
                  Entrar
                </Link>
              </div>
            </div>

            {/* Demo Card */}
            <div>
              <DemoTicketFlow theme={theme} />
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid gap-3 sm:gap-3.5 md:grid-cols-3">
            <FeatureCard
              title="Fluxo de cliente"
              description="Abra e acompanhe seus próprios chamados, edite o conteúdo e veja responsável e andamento."
              delay={0}
              theme={theme}
            />

            <FeatureCard
              title="Fluxo de agente"
              description="Triagem de todos os chamados, atualização de status, prioridade e atribuição de responsável."
              delay={100}
              theme={theme}
            />

            <div className="md:col-span-1">
              <FeatureCard
                title="Segurança por padrão"
                description="Autorização validada no servidor, propriedade dos dados e respostas seguras para acessos indevidos."
                delay={200}
                theme={theme}
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer minimalista discreto */}
      <footer className={`shrink-0 py-2 text-center text-[11px] border-t transition-colors ${
        theme === "light" ? "border-slate-200 text-slate-400" : "border-slate-800 text-slate-500"
      }`}>
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between">
          <span>HelpFlow © {new Date().getFullYear()} — Plataforma de Atendimento</span>
          <span>Desenvolvido por Tharcio Santos</span>
        </div>
      </footer>
    </div>
  );
}


