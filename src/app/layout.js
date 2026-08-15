import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import AuthProvider from "./components/AuthProvider";
import ThemeProvider from "./components/ThemeProvider";
import { ThemeInitScript } from "./components/ThemeInitScript";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "HelpFlow - Sistema de HelpDesk",
  description: "Gerencie seus chamados de suporte de forma eficiente.",
};

export default async function RootLayout({ children }) {
  // Ler o cookie do tema durante o SSR. Isso garante que o HTML já sai
  // do servidor com a classe correta (<html class="light">), eliminando
  // 100% de qualquer flash (FOUC) visual.
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("helpflow-theme")?.value;
  const initialTheme = themeCookie === "light" ? "light" : "dark";
  const htmlClassName = initialTheme === "light" ? "light" : undefined;

  return (
    // suppressHydrationWarning é mantido como salvaguarda caso o script
    // de fallback (ThemeInitScript) precise ajustar a classe no primeiro acesso.
    <html lang="pt-BR" className={htmlClassName} suppressHydrationWarning>
      <head>
        {/* Script de fallback para primeira visita (sem cookie salvo),
            detectando o matchMedia do SO antes da primeira pintura. */}
        <ThemeInitScript />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        // suppressHydrationWarning também no <body>: algumas extensões de
        // navegador (ex.: ColorZilla adiciona cz-shortcut-listen="true") injetam
        // atributos no <body> antes da hidratação. Isso gera warning em modo dev;
        // em produção é inofensivo e não existe. O atributo é apenas ignorado.
        suppressHydrationWarning
      >
        <ThemeProvider initialTheme={initialTheme}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
