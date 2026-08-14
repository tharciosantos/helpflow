import DemoTicketFlow from "./components/DemoTicketFlow";
import ThemeToggle from "./components/ThemeToggle";
import FeatureCard from "./components/FeatureCard";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-white dark:bg-slate-950 dark:text-white light:bg-slate-50 light:text-slate-900 sm:px-6 sm:py-16">
      {/* Header com Theme Toggle */}
      <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <section className="mx-auto max-w-5xl">
        {/* Hero Section com animações */}
        <div className="grid items-center gap-10 sm:gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
          <div>
            <p className="fade-in text-sm font-semibold text-teal-300 dark:text-teal-300 light:text-teal-600 sm:text-base">
              HelpFlow · demonstração de produto
            </p>

            <h1 className="fade-in-delay-1 mt-3 text-3xl font-bold leading-tight tracking-tight sm:mt-4 sm:text-4xl md:text-5xl lg:text-6xl">
              Suporte organizado, com cada pessoa vendo e fazendo apenas o que precisa.
            </h1>

            <p className="fade-in-delay-2 mt-4 max-w-2xl text-base leading-7 text-slate-300 dark:text-slate-300 light:text-slate-600 sm:mt-6 sm:text-lg sm:leading-8">
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
                className="rounded-lg border border-slate-600 px-5 py-3 text-center font-semibold transition-all hover:border-teal-400 hover:shadow-md dark:border-slate-600 dark:hover:border-teal-400 light:border-slate-300 light:hover:border-teal-500"
              >
                Entrar
              </Link>
            </div>

          </div>
          
          {/* Demo Card */}
          <div className="fade-in-delay-2 mt-8 lg:mt-0">
            <DemoTicketFlow />
          </div>
        </div>

        {/* Features Grid com scroll reveal */}
        <div className="mt-12 grid gap-4 sm:mt-16 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            title="Fluxo de cliente"
            description="Abra e acompanhe seus próprios chamados, edite o conteúdo e veja responsável e andamento."
            delay={0}
          />

          <FeatureCard
            title="Fluxo de agente"
            description="Triagem de todos os chamados, atualização de status, prioridade e atribuição de responsável."
            delay={100}
          />

          <div className="md:col-span-2 lg:col-span-1">
            <FeatureCard
              title="Segurança por padrão"
              description="Autorização validada no servidor, propriedade dos dados e respostas seguras para acessos indevidos."
              delay={200}
            />
          </div>
        </div>
      </section>
    </main>
  );
}


