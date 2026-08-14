"use client";

import useScrollReveal from "../hooks/useScrollReveal";

export default function FeatureCard({ title, description, delay = 0 }) {
  const ref = useScrollReveal({ threshold: 0.2 });

  return (
    <article
      ref={ref}
      className="scroll-reveal hover-lift rounded-xl border border-slate-800 bg-slate-900 p-5 transition-colors dark:border-slate-800 dark:bg-slate-900 light:border-slate-200 light:bg-white sm:p-6"
      style={{ animationDelay: `${delay}ms` }}
    >
      <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400 dark:text-slate-400 light:text-slate-600 sm:text-base">
        {description}
      </p>
    </article>
  );
}
