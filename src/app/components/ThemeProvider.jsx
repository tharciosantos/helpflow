"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";

const ThemeContext = createContext({
  theme: "dark",
  toggleTheme: () => {},
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme deve ser usado dentro do ThemeProvider");
  }
  return context;
};

// Função auxiliar para definir o cookie de tema no navegador com 1 ano de expiração.
function setThemeCookie(value) {
  if (typeof document === "undefined") return;
  const maxAge = 365 * 24 * 60 * 60; // 1 ano
  document.cookie = `helpflow-theme=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

// Inscrição para mudanças externas (outras abas ou preferência do SO).
function subscribeToTheme(callback) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("storage", callback);
  const mql = window.matchMedia("(prefers-color-scheme: light)");
  mql.addEventListener("change", callback);

  return () => {
    window.removeEventListener("storage", callback);
    mql.removeEventListener("change", callback);
  };
}

// Snapshot do cliente: lê do DOM (classe .light no <html>).
function getClientSnapshot() {
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

export default function ThemeProvider({ children, initialTheme = "dark" }) {
  // Snapshot do servidor: usa a prop 'initialTheme' lida do cookie via SSR layout.
  const getServerSnapshot = () => initialTheme;

  const themeFromStore = useSyncExternalStore(
    subscribeToTheme,
    getClientSnapshot,
    getServerSnapshot
  );

  const [overrideTheme, setOverrideTheme] = useState(null);

  const theme = overrideTheme ?? themeFromStore;

  // Persistir em localStorage E no Cookie quando o usuário interage via toggle.
  useEffect(() => {
    if (overrideTheme === null) return;

    const root = document.documentElement;
    if (overrideTheme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      root.classList.add("dark");
      root.classList.remove("light");
    }

    localStorage.setItem("helpflow-theme", overrideTheme);
    setThemeCookie(overrideTheme);
  }, [overrideTheme]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setOverrideTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
