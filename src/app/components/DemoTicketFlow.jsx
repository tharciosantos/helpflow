"use client";

import { useLayoutEffect, useRef, useState } from "react";
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
    const [currentStep, setCurrentStep] = useState(() => getDemoInitialStep(false));
    const rootRef = useRef(null);

    useLayoutEffect(() => {
        const prefersReducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

        if (prefersReducedMotion) {
            setCurrentStep(getDemoInitialStep(true));
            return undefined;
        }

        const scope = createScope({ root: rootRef }).add(() => {
            const steps = rootRef.current.querySelectorAll("[data-flow-step]");

            utils.set(steps, {
                opacity: 0,
                x: -12,
            });

            const timeline = createTimeline({
                defaults: {
                    ease: "out(3)",
                },
            });

            timeline
                .add("[data-ticket-card]", {
                    opacity: [0, 1],
                    y: [24, 0],
                    scale: [0.96, 1],
                    duration: 850,
                })
                .add(
                    steps,
                    {
                        opacity: 1,
                        x: 0,
                        duration: 450,
                        delay: stagger(140),
                    },
                    "-=350",
                );

            steps.forEach((step, index) => {
                timeline.add(step, {
                    scale: [1, 1.08, 1],
                    duration: 420,
                    delay: index === 0 ? 250 : 450,
                    onBegin: () => {
                        setCurrentStep(index);
                    },
                });
            });
        });

        return () => scope.revert();
    }, []);

    return (
        <section
            ref={rootRef}
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
                        className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors duration-300 ${statuses[currentStep].badgeClasses}`}
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
                                    className={`flex items-center gap-3 text-sm transition-colors duration-300 ${isCurrent || isCompleted
                                        ? "text-slate-200"
                                        : "text-slate-400"
                                        }`}
                                >
                                    <span
                                        className={`h-3 w-3 rounded-full transition-all duration-300 ${isCurrent
                                            ? "bg-teal-400 ring-4 ring-teal-400/15"
                                            : isCompleted
                                                ? "bg-teal-700"
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
