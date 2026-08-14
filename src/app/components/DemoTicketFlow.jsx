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
    badgeClasses: getStatusBadgeClasses(status),
}));

export default function DemoTicketFlow() {
    const [currentStep, setCurrentStep] = useState(0);
    const rootRef = useRef(null);

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
        });

        return () => scope.revert();
    }, []);

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
                className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/95 p-6 shadow-2xl shadow-black/30"
            >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-teal-300">
                            Ticket #1042
                        </p>

                        <h2
                            id="demo-ticket-title"
                            className="mt-2 text-xl font-semibold"
                        >
                            Falha ao acessar relatório mensal
                        </h2>
                    </div>

                    <span
                        data-ticket-badge
                        className={`rounded-full px-3 py-1 text-sm font-semibold transition-all duration-500 ${statuses[currentStep].badgeClasses}`}
                        role="status"
                        aria-live="polite"
                        aria-atomic="true"
                    >
                        {statuses[currentStep].label}
                    </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-400">
                    O relatório não carrega após a seleção do período.
                </p>

                <div className="mt-6 border-t border-slate-800 pt-5">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                        Andamento
                    </p>

                    <ol className="mt-4 grid gap-3">
                        {statuses.map((status, index) => {
                            const isCurrent = index === currentStep;
                            const isCompleted = index < currentStep;

                            return (
                                <li
                                    key={status.code}
                                    data-flow-step
                                    aria-current={isCurrent ? "step" : undefined}
                                    className={`flex items-center gap-3 text-sm transition-all duration-500 ${isCurrent || isCompleted
                                        ? "text-slate-200 font-medium"
                                        : "text-slate-500"
                                        }`}
                                >
                                    <span
                                        className={`h-3 w-3 rounded-full transition-all duration-500 ${isCurrent
                                            ? "bg-teal-400 ring-4 ring-teal-400/20 scale-110"
                                            : isCompleted
                                                ? "bg-teal-600"
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

                <div className="mt-6 flex items-center justify-between rounded-xl bg-slate-950/70 px-4 py-3 text-sm">
                    <span className="text-slate-500">Responsável</span>
                    <span className="font-medium text-slate-300">
                        Equipe de suporte
                    </span>
                </div>
            </div>
        </section>
    );
}
