import Link from "next/link";
import Image from "next/image";

export default function MaintenanceNotice() {
    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Em manutenção</h1>
                        <p className="text-gray-400">
                            Esta funcionalidade está temporariamente indisponível.
                        </p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
                        <p className="text-sm text-gray-300">
                            Estamos trabalhando para oferecer uma experiência melhor de recuperação de senha.
                            Tente novamente mais tarde.
                        </p>
                    </div>

                    <Link
                        href="/login"
                        className="block w-full text-center rounded-md bg-teal-500 px-4 py-2 font-semibold text-white transition hover:bg-teal-400"
                    >
                        Voltar para o Login
                    </Link>
                </div>
            </div>
        </main>
    );
}
