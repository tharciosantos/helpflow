"use client";

import { useEffect, useRef, useState } from "react";
import {
    createScope,
    createTimeline,
    stagger,
    utils,
} from "animejs";
import {
    DEMO_TICKET_STATUS_SEQUENCE,
    getDemoInitialStep,
} from "@/lib/demoTicketFlow";
import {
    getStatusBadgeClasses,
    getStatusDisplayNamePT,
} from "@/lib/ticketUtils";

const statuses = DEMO_TICKET_STATUS_SEQUENCE.map((status) => ({
    code: status,
    label: getStatusDisplayNamePT(status),
}));

export default function DemoTicketFlow({ theme = "dark" }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const rootRef = useRef(null);
    const timelineRef = useRef(null);
    
    // Gerar badgeClasses com o tema atual
    const statusesWithBadges = statuses.map(status => ({
        ...status,
        badgeClasses: getStatusBadgeClasses(status.code, theme)
    }));

    useEffect(() => {
        const scope = createScope({ root: rootRef }).add(() => {
            const steps = rootRef.current?.querySelectorAll("[data-flow-step]");
            if (!steps || steps.length === 0) return;

            utils.set(steps, {
                opacity: 0,
                x: -12,
            });

            utils.set("[data-ticket-card]", {
                opacity: 0,
                y: 20,
                scale: 0.97,
            });

            const timeline = createTimeline({
                defaults: {
                    ease: "outQuart",
                },
                loop: true,
                loopDelay: 2000,
            });

            // Entrada inicial do card e dos passos
            timeline
                .call(() => {
                    setCurrentStep(0);
                }, 0)
                .add("[data-ticket-card]", {
                    opacity: [0, 1],
                    y: [20, 0],
                    scale: [0.97, 1],
                    duration: 500,
                })
                .add(
                    steps,
                    {
                        opacity: [0, 1],
                        x: [-12, 0],
                        duration: 400,
                        delay: stagger(100),
                    },
                    "-=300",
                );

            // Etapa 0: Aberto (destaque e pausa de 2.5s)
            if (steps[0]) {
                timeline.add(steps[0], {
                    scale: [1, 1.05, 1],
                    duration: 350,
                });
            }
            timeline.add({ val: 0 }, { val: 1, duration: 1500 });

            // Transição para Etapa 1: Em Progresso (destaque e pausa de 2.5s)
            timeline.call(() => {
                setCurrentStep(1);
            });
            if (steps[1]) {
                timeline.add(steps[1], {
                    scale: [1, 1.05, 1],
                    duration: 350,
                });
            }
            timeline.add({ val: 0 }, { val: 1, duration: 1500 });

            // Transição para Etapa 2: Fechado (destaque e pausa de 3s)
            timeline.call(() => {
                setCurrentStep(2);
            });
            if (steps[2]) {
                timeline.add(steps[2], {
                    scale: [1, 1.05, 1],
                    duration: 350,
                });
            }
            timeline.add({ val: 0 }, { val: 1, duration: 3000 });

            // Armazenar referência da timeline
            timelineRef.current = timeline;
        });

        return () => scope.revert();
    }, []);

    // Função para pausar/retomar animação
    const toggleAnimation = () => {
        if (!timelineRef.current) return;

        if (isPaused) {
            timelineRef.current.play();
        } else {
            timelineRef.current.pause();
        }
        setIsPaused(!isPaused);
    };

    return (
        <section
            ref={rootRef}
            data-demo-flow
            className="relative mx-auto w-full max-w-md"
            aria-labelledby="demo-ticket-title"
        >
            <div
                className="absolute -inset-6 rounded-full bg-teal-500/10 blur-3xl"
                aria-hidden="true"
            />

            <div
                data-ticket-card
                onClick={toggleAnimation}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleAnimation();
                    }
                }}
                role="button"
                tabIndex={0}
                aria-label={isPaused ? "Clique para retomar animação" : "Clique para pausar animação"}
                className={`relative cursor-pointer overflow-hidden rounded-2xl border p-4 sm:p-5 shadow-xl transition-shadow ${
                    theme === "light"
                        ? "border-slate-200 bg-white/95 shadow-slate-200/50 hover:shadow-teal-500/20"
                        : "border-slate-700 bg-slate-900/95 shadow-black/30 hover:shadow-teal-500/10"
                }`}
            >
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className={`text-xs font-semibold ${
                            theme === "light" ? "text-teal-600" : "text-teal-400"
                        }`}>
                            Ticket #1042
                        </p>

                        <h2
                            id="demo-ticket-title"
                            className={`mt-1 text-base sm:text-lg font-bold leading-snug ${
                                theme === "light" ? "text-slate-900" : "text-slate-100"
                            }`}
                        >
                            Falha ao acessar relatório mensal
                        </h2>
                    </div>

                    <span
                        data-ticket-badge
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all duration-500 ${statusesWithBadges[currentStep].badgeClasses}`}
                        role="status"
                        aria-live="polite"
                        aria-atomic="true"
                    >
                        {statusesWithBadges[currentStep].label}
                    </span>
                </div>

                <p className={`mt-2 text-xs sm:text-sm leading-relaxed ${
                    theme === "light" ? "text-slate-600" : "text-slate-400"
                }`}>
                    O relatório não carrega após a seleção do período.
                </p>

                <div className={`mt-3.5 border-t pt-3 ${
                    theme === "light" ? "border-slate-200" : "border-slate-800"
                }`}>
                    <p className={`text-[11px] font-bold uppercase tracking-wider ${
                        theme === "light" ? "text-slate-500" : "text-slate-400"
                    }`}>
                        Andamento
                    </p>

                    <ol className="mt-2.5 grid gap-2">
                        {statusesWithBadges.map((status, index) => {
                            const isCurrent = index === currentStep;
                            const isCompleted = index < currentStep;

                            return (
                                <li
                                    key={status.code}
                                    data-flow-step
                                    aria-current={isCurrent ? "step" : undefined}
                                    className={`flex items-center gap-2.5 text-xs sm:text-sm transition-all duration-500 ${
                                        isCurrent || isCompleted
                                            ? theme === "light"
                                                ? "text-slate-800 font-medium"
                                                : "text-slate-200 font-medium"
                                            : theme === "light"
                                                ? "text-slate-400"
                                                : "text-slate-500"
                                    }`}
                                >
                                    <span
                                        className={`h-2.5 w-2.5 rounded-full transition-all duration-500 ${isCurrent
                                            ? "bg-teal-400 ring-4 ring-teal-400/20 scale-110"
                                            : isCompleted
                                                ? "bg-teal-600"
                                                : theme === "light"
                                                    ? "bg-slate-300"
                                                    : "bg-slate-700"
                                            }`}
                                    />

                                    <span>
                                        <span className="sr-only">
                                            {isCurrent
                                                ? "Etapa atual: "
                                                : isCompleted
                                                    ? "Etapa concluída: "
                                                    : "Próxima etapa: "}
                                        </span>
                                        {status.label}
                                    </span>
                                </li>
                            );
                        })}
                    </ol>
                </div>

                <div className={`mt-3.5 flex items-center justify-between rounded-lg px-3 py-2 text-xs ${
                    theme === "light"
                        ? "bg-slate-100/70"
                        : "bg-slate-950/70"
                }`}>
                    <span className={theme === "light" ? "text-slate-600" : "text-slate-400"}>
                        Responsável
                    </span>
                    <span className={`font-semibold ${
                        theme === "light" ? "text-slate-900" : "text-slate-200"
                    }`}>
                        Equipe de suporte
                    </span>
                </div>
            </div>

            {/* Controle de Animação */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    toggleAnimation();
                }}
                className={`relative z-10 mx-auto mt-3 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${
                    theme === "light"
                        ? "border-slate-300 bg-white text-slate-700 hover:border-teal-500 hover:text-teal-600"
                        : "border-slate-700 bg-slate-800/80 text-slate-300 hover:border-teal-500/50 hover:bg-slate-800 hover:text-teal-300"
                }`}
                aria-label={isPaused ? "Retomar animação" : "Pausar animação"}
                aria-pressed={isPaused}
            >
                {isPaused ? (
                    <>
                        <svg
                            className="h-4 w-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            aria-hidden="true"
                        >
                            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                        <span>Retomar</span>
                    </>
                ) : (
                    <>
                        <svg
                            className="h-4 w-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            aria-hidden="true"
                        >
                            <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
                        </svg>
                        <span>Pausar</span>
                    </>
                )}
            </button>
        </section>
    );
}
