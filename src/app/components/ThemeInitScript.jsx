// Script de bloqueio que roda no <head> e decide o tema ANTES do primeiro paint.
// Fonte da verdade para o tema:
//   1. localStorage("helpflow-theme")  — preferência explícita do usuário
//   2. cookie("helpflow-theme")        — definido pelo SSR do layout (cookie-based SSR)
//   3. matchMedia("(prefers-color-scheme: light)")  — preferência do SO (primeiro acesso)
//   4. fallback: "dark"
// Aplica a classe .light no <html> e GRAVA o cookie + localStorage, garantindo que
// o próximo carregamento (F5 ou navegação) já receba o tema correto via SSR.
//
// Usa dangerouslySetInnerHTML para que o Next.js injete o script INLINE no HTML
// (e não como um <script src> carregado depois). O atributo suppressHydrationWarning
// no <html> (visto no layout.js) é necessário porque o script altera o DOM
// antes do React montar.
const themeInitScript = `(function(){try{
  var root = document.documentElement;
  var theme = null;

  // 1. Preferência explícita do usuário (localStorage)
  var stored = null;
  try { stored = localStorage.getItem('helpflow-theme'); } catch(e) {}
  if (stored === 'light' || stored === 'dark') {
    theme = stored;
  }

  // 2. Cookie definido pelo SSR (avoidando depender só de localStorage)
  if (!theme) {
    var cookieTheme = document.cookie.match(/(?:^|; )helpflow-theme=([^;]*)/);
    if (cookieTheme && (cookieTheme[1] === 'light' || cookieTheme[1] === 'dark')) {
      theme = cookieTheme[1];
    }
  }

  // 3. Preferência do sistema (primeiro acesso, sem preferência salva)
  if (!theme && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    theme = 'light';
  }

  // 4. Fallback final
  if (!theme) {
    theme = 'dark';
  }

  // Aplicar no DOM antes da primeira pintura
  if (theme === 'light') {
    root.classList.add('light');
    root.classList.remove('dark');
  } else {
    root.classList.add('dark');
    root.classList.remove('light');
  }

  // Persistir cookie (para o SSR já vir correto no próximo carregamento)
  // e localStorage (consistência entre abas via evento 'storage').
  var maxAge = 365 * 24 * 60 * 60;
  document.cookie = 'helpflow-theme=' + theme + '; path=/; max-age=' + maxAge + '; SameSite=Lax';
  try { localStorage.setItem('helpflow-theme', theme); } catch(e) {}
} catch(e){}})();`;

export function ThemeInitScript() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: themeInitScript }}
    />
  );
}
