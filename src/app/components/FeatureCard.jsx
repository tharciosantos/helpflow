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
          ? "border-slate-200/90 bg-white hover:border-teal-500/40 hover:shadow-md hover:shadow-teal-500/5"
          : "border-slate-800 bg-slate-900/90 hover:border-teal-500/40 hover:shadow-md hover:shadow-teal-500/10"
      }`}
      style={{ animationDelay: hasAnimated ? "0ms" : `${delay}ms` }}
    >
      <div className={`mb-2.5 inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-transform duration-300 group-hover:scale-105 ${
        theme === "light"
          ? "border-teal-200 bg-teal-50 text-teal-600"
          : "border-teal-800/60 bg-teal-950/50 text-teal-400"
      }`}>
        <IconComponent size={16} />
      </div>
      <h2 className="text-sm sm:text-base font-bold">{title}</h2>
      <p className={`mt-1 text-xs leading-relaxed ${
        theme === "light" ? "text-slate-600" : "text-slate-400"
      }`}>
        {description}
      </p>
    </article>
  );
}
