"use client";

import { useEffect, useRef, useState } from "react";

export default function FeatureCard({ title, description, delay = 0, theme = "dark" }) {
  const ref = useRef(null);
  const [hasAnimated, setHasAnimated] = useState(false);

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
      className={`hover-lift rounded-xl border p-5 transition-colors sm:p-6 ${
        hasAnimated ? "opacity-100" : "scroll-reveal"
      } ${
        theme === "light"
          ? "border-slate-200 bg-white"
          : "border-slate-800 bg-slate-900"
      }`}
      style={{ animationDelay: hasAnimated ? "0ms" : `${delay}ms` }}
    >
      <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>
      <p className={`mt-2 text-sm leading-6 sm:text-base ${
        theme === "light" ? "text-slate-600" : "text-slate-400"
      }`}>
        {description}
      </p>
    </article>
  );
}
