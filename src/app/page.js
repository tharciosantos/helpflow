"use client";

import DemoTicketFlow from "./components/DemoTicketFlow";
import ThemeToggle from "./components/ThemeToggle";
import FeatureCard from "./components/FeatureCard";
import { useTheme } from "./components/ThemeProvider";
import Link from "next/link";

export default function Home() {
  const { theme } = useTheme();
  
  return (
    <main className={`min-h-screen px-4 py-12 sm:px-6 sm:py-16 ${
      theme === "light" 
        ? "bg-slate-50 text-slate-900" 
        : "bg-slate-950 text-white"
    }`}>
      {/* Header com Theme Toggle */}
      <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <section className="mx-auto max-w-5xl">
        {/* Hero Section com animações */}
        <div className="grid items-center gap-10 sm:gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
          <div>
            <p className={`fade-in text-sm font-semibold sm:text-base ${
              theme === "light" ? "text-teal-600" : "text-teal-300"
            }`}>
              HelpFlow · demonstração de produto
            </p>

            <h1 className="fade-in-delay-1 mt-3 text-3xl font-bold leading-tight tracking-tight sm:mt-4 sm:text-4xl md:text-5xl lg:text-6xl">
              Suporte organizado, com cada pessoa vendo e fazendo apenas o que precisa.
            </h1>

            <p className={`fade-in-delay-2 mt-4 max-w-2xl text-base leading-7 sm:mt-6 sm:text-lg sm:leading-8 ${
              theme === "light" ? "text-slate-600" : "text-slate-300"
            }`}>
              Conheça os principais fluxos com dados fictícios criados na sua
              própria conta. Nenhuma credencial compartilhada ou dado real é
              exposto nesta demonstração.
            </p>

            <div className="fade-in-delay-3 mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
              <Link
                href="/register"
                className="rounded-lg bg-teal-500 px-5 py-3 text-center font-semibold text-slate-950 transition-all hover:bg-teal-400 hover:shadow-lg hover:shadow-teal-500/20"
              >
                Criar conta de demonstração
              </Link>

              <Link
                href="/login"
                className={`rounded-lg border px-5 py-3 text-center font-semibold transition-all hover:shadow-md ${
                  theme === "light"
                    ? "border-slate-300 hover:border-teal-500"
                    : "border-slate-600 hover:border-teal-400"
                }`}
              >
                Entrar
              </Link>
            </div>

          </div>
          
          {/* Demo Card */}
          <div className="fade-in-delay-2 mt-8 lg:mt-0">
            <DemoTicketFlow theme={theme} />
          </div>
        </div>

        {/* Features Grid com scroll reveal */}
        <div className="mt-12 grid gap-4 sm:mt-16 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
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

          <div className="md:col-span-2 lg:col-span-1">
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
  );
}


