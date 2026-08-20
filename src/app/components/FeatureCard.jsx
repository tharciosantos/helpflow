"use client";

import { useEffect, useRef, useState } from "react";
import { LuUserCheck, LuShieldCheck, LuLock } from "react-icons/lu";

const iconMap = {
  "Fluxo de cliente": LuUserCheck,
  "Fluxo de agente": LuShieldCheck,
  "Segurança por padrão": LuLock,
};

export default function FeatureCard({ title, description, delay = 0, theme = "dark" }) {
  const ref = useRef(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  const IconComponent = iconMap[title] || LuShieldCheck;

  useEffect(() => {
    const element = ref.current;
    if (!element || hasAnimated) return;

    // Respeitar preferência de animação reduzida
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      element.style.opacity = "1";
      element.style.transform = "none";
      setHasAnimated(true);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !hasAnimated) {
          entry.target.classList.add("animate-reveal");
          setHasAnimated(true);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [hasAnimated]);

  return (
    <article
      ref={ref}
      className={`hover-lift group rounded-xl border p-3.5 sm:p-4 transition-all duration-300 ${
        hasAnimated ? "opacity-100" : "scroll-reveal"
      } ${
        theme === "light"
          ? "border-slate-200 bg-white hover:border-emerald-200 hover:shadow-md"
          : "border-slate-800 bg-slate-900/90 hover:border-slate-700 hover:shadow-md"
      }`}
      style={{ animationDelay: hasAnimated ? "0ms" : `${delay}ms` }}
    >
      <div className={`mb-2.5 inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-transform duration-300 group-hover:scale-105 ${
        theme === "light"
          ? "border-emerald-200/80 bg-emerald-50 text-emerald-600"
          : "border-emerald-900/40 bg-emerald-950/40 text-emerald-400"
      }`}>
        <IconComponent size={16} />
      </div>
      <h2 className={`text-sm sm:text-base font-bold ${
        theme === "light" ? "text-slate-900" : "text-white"
      }`}>{title}</h2>
      <p className={`mt-1 text-xs leading-relaxed ${
        theme === "light" ? "text-slate-600" : "text-slate-400"
      }`}>
        {description}
      </p>
    </article>
  );
}
