import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <section className="mx-auto max-w-5xl">
        <p className="font-semibold text-teal-300">HelpFlow · demonstração de produto</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">Suporte organizado, com cada pessoa vendo e fazendo apenas o que precisa.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">Conheça os principais fluxos com dados fictícios criados na sua própria conta. Nenhuma credencial compartilhada ou dado real é exposto nesta demonstração.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/register" className="rounded-lg bg-teal-500 px-5 py-3 font-semibold text-slate-950 hover:bg-teal-400">Criar conta de demonstração</Link>
          <Link href="/login" className="rounded-lg border border-slate-600 px-5 py-3 font-semibold hover:border-teal-400">Entrar</Link>
        </div>
        <div className="mt-16 grid gap-5 md:grid-cols-3">
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-6"><h2 className="text-xl font-semibold">Fluxo de cliente</h2><p className="mt-2 text-slate-400">Abra e acompanhe seus próprios chamados, edite o conteúdo e veja responsável e andamento.</p></article>
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-6"><h2 className="text-xl font-semibold">Fluxo de agente</h2><p className="mt-2 text-slate-400">Triagem de todos os chamados, atualização de status, prioridade e atribuição de responsável.</p></article>
          <article className="rounded-xl border border-slate-800 bg-slate-900 p-6"><h2 className="text-xl font-semibold">Segurança por padrão</h2><p className="mt-2 text-slate-400">Autorização validada no servidor, propriedade dos dados e respostas seguras para acessos indevidos.</p></article>
        </div>
      </section>
    </main>
  );
}

