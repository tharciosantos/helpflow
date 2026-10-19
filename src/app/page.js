"use client";

import DemoTicketFlow from "./components/DemoTicketFlow";
import ThemeToggle from "./components/ThemeToggle";
import FeatureCard from "./components/FeatureCard";
import { useTheme } from "./components/ThemeProvider";
import Link from "next/link";
import { LuCircleCheck, LuArrowRight } from "react-icons/lu";

const PROOF_POINTS = [
  "Cada empresa vê só os próprios chamados",
  "Funcionário abre e acompanha em segundos",
  "Suporte tria, prioriza e resolve sem ruído",
];

const STEPS = [
  {
    number: "1",
    title: "Crie sua conta",
    description: "Empresa cria o espaço e recebe um código de convite único.",
  },
  {
    number: "2",
    title: "Convide a equipe",
    description: "Funcionários entram com o código e abrem chamados privados.",
  },
  {
    number: "3",
    title: "Resolva em fluxo",
    description: "Suporte tria, atribui, prioriza e acompanha até fechar.",
  },
];

export default function Home() {
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <div className={`min-h-screen min-w-0 ${
      isLight
        ? "bg-slate-50 text-slate-900" 
        : "bg-slate-950 text-slate-100"
    }`}>
      {/* Header com Logo, Badge de Demonstração e Theme Toggle */}
      <header className={`sticky top-0 z-50 backdrop-blur-md transition-colors border-b px-4 py-2.5 sm:px-6 md:px-8 [padding-top:max(0.625rem,env(safe-area-inset-top))] ${
        isLight
          ? "bg-white/80 border-slate-200"
          : "bg-slate-950/80 border-slate-800"
      }`}>
        <div className="mx-auto flex max-w-5xl min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className={`truncate text-lg sm:text-xl font-bold tracking-tight ${
              isLight ? "text-slate-900" : "text-white"
            }`}>
              Help<span className="text-emerald-600 dark:text-emerald-400">Flow</span>
            </span>
            <span className={`hidden sm:inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
              isLight
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-emerald-950/50 text-emerald-300 border-emerald-800/40"
            }`}>
              Demonstração Aberta
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className={`rounded-lg px-2.5 sm:px-3 py-2 text-sm font-medium transition ${
                isLight
                  ? "text-slate-600 hover:text-slate-950"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 sm:px-3.5 py-2 sm:py-1.5 text-sm font-semibold transition shadow-xs whitespace-nowrap"
            >
              Criar Conta
            </Link>
            <div className="border-l pl-2 sm:pl-3 ml-0.5 sm:ml-1 border-slate-300 dark:border-slate-700">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo rolável com foco em conversão */}
      <main className="mx-auto w-full min-w-0 max-w-5xl px-4 sm:px-6">
        {/* Hero curto de conversão */}
        <section className="pb-8 pt-8 sm:pb-12 sm:pt-12">
          <div className="grid min-w-0 items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
            <div className="min-w-0">
              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border ${
                isLight
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-emerald-950/50 text-emerald-300 border-emerald-800/40"
              }`}>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                Service desk por empresa, sem mistura
              </div>

              <h1 className={`mt-3 text-[1.75rem] sm:text-4xl lg:text-[2.75rem] font-bold leading-[1.1] tracking-tight text-balance ${
                isLight ? "text-slate-900" : "text-white"
              }`}>
                Cada chamado na empresa certa, com o dono certo.
              </h1>

              <p className={`mt-3 max-w-xl text-sm sm:text-base leading-relaxed ${
                isLight ? "text-slate-600" : "text-slate-300"
              }`}>
                O HelpFlow separa por empresa, organiza a triagem e mostra o
                andamento em tempo real — do “abri o chamado” ao “resolvido”.
              </p>

              <ul className="mt-4 space-y-2">
                {PROOF_POINTS.map((point) => (
                  <li
                    key={point}
                    className={`flex items-start gap-2 text-[13px] sm:text-sm font-medium ${
                      isLight ? "text-slate-700" : "text-slate-200"
                    }`}
                  >
                    <LuCircleCheck size={17} className="mt-0.5 shrink-0 text-emerald-500" aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <Link
                  href="/register"
                  data-cy="landing-cta-primary"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 sm:py-3 text-base sm:text-sm font-bold transition-all hover:shadow-lg hover:shadow-emerald-600/20 active:scale-[0.98]"
                >
                  Criar conta grátis
                  <LuArrowRight size={17} aria-hidden="true" />
                </Link>
              </div>

              <p className={`mt-3 text-xs leading-relaxed ${
                isLight ? "text-slate-500" : "text-slate-400"
              }`}>
                Sem cartão. Demonstração com dados fictícios — nenhum dado real é exposto.
              </p>
            </div>

            {/* Demo em destaque */}
            <div id="demo" className="min-w-0 scroll-mt-24">
              <DemoTicketFlow theme={theme} />
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section className={`border-t py-8 sm:py-12 ${
          isLight ? "border-slate-200" : "border-slate-800"
        }`}>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Como funciona
          </p>
          <h2 className={`mt-2 max-w-xl text-xl sm:text-2xl font-bold tracking-tight text-balance ${
            isLight ? "text-slate-900" : "text-white"
          }`}>
            Do convite à resolução em 3 passos
          </h2>

          <ol className="mt-5 grid min-w-0 gap-3 sm:grid-cols-3 sm:gap-4">
            {STEPS.map((step) => (
              <li
                key={step.number}
                className={`rounded-xl border p-4 sm:p-5 ${
                  isLight
                    ? "border-slate-200 bg-white"
                    : "border-slate-800 bg-slate-900/90"
                }`}
              >
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${
                  isLight
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-emerald-950/50 text-emerald-300 border border-emerald-800/40"
                }`}>
                  {step.number}
                </span>
                <h3 className={`mt-3 text-sm sm:text-base font-bold ${
                  isLight ? "text-slate-900" : "text-white"
                }`}>
                  {step.title}
                </h3>
                <p className={`mt-1.5 text-[13px] sm:text-sm leading-relaxed ${
                  isLight ? "text-slate-600" : "text-slate-400"
                }`}>
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* Recursos */}
        <section className={`border-t py-8 sm:py-12 ${
          isLight ? "border-slate-200" : "border-slate-800"
        }`}>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Recursos
          </p>
          <h2 className={`mt-2 max-w-xl text-xl sm:text-2xl font-bold tracking-tight text-balance ${
            isLight ? "text-slate-900" : "text-white"
          }`}>
            Feito para funcionário e suporte não se atropelarem
          </h2>

          <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
            <FeatureCard
              title="Empresa isolada"
              icon="Empresa isolada"
              description="Multi-tenant de verdade: cada empresa enxerga e gerencia só os próprios chamados."
              delay={0}
              theme={theme}
            />

            <FeatureCard
              title="Triagem simples"
              icon="Triagem simples"
              description="Status, prioridade, responsável e prazo num fluxo só, sem planilha paralela."
              delay={100}
              theme={theme}
            />

            <FeatureCard
              title="Convite por código"
              icon="Convite por código"
              description="Funcionário entra com o código da empresa e já abre chamados privados para o suporte."
              delay={200}
              theme={theme}
            />
          </div>
        </section>

        {/* Faixa final de conversão */}
        <section className="pb-10 sm:pb-14">
          <div className={`rounded-2xl border p-6 sm:p-8 text-center ${
            isLight
              ? "bg-emerald-600 border-emerald-600 text-white"
              : "bg-emerald-950/60 border-emerald-800/50 text-white"
          }`}>
            <h2 className="mx-auto max-w-md text-xl sm:text-2xl font-bold tracking-tight text-balance">
              Organize o suporte antes do próximo chamado urgente
            </h2>
            <p className={`mx-auto mt-2 max-w-md text-sm leading-relaxed ${
              isLight ? "text-emerald-50" : "text-slate-300"
            }`}>
              Crie o espaço da sua empresa e convide a equipe em minutos.
            </p>
            <Link
              href="/register"
              data-cy="landing-cta-final"
              className="mt-5 inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 sm:py-3 text-base sm:text-sm font-bold text-emerald-700 transition-all hover:shadow-lg active:scale-[0.98]"
            >
              Começar agora
              <LuArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer minimalista discreto */}
      <footer className={`py-3 text-center text-[11px] border-t transition-colors [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))] ${
        isLight ? "border-slate-200 text-slate-400" : "border-slate-800 text-slate-500"
      }`}>
        <div className="max-w-5xl mx-auto px-4 flex flex-col min-[420px]:flex-row items-center justify-between gap-0.5 min-[420px]:gap-2">
          <span className="truncate">HelpFlow © {new Date().getFullYear()} - Plataforma de Atendimento</span>
          <span className="shrink-0">Desenvolvido por Tharcio Santos</span>
        </div>
      </footer>
    </div>
  );
}


