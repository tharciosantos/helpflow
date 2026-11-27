// Foco em painéis modais (sino, drawer mobile e ConfirmDialog) — item 10 do
// backlog: focus trap, restauração do foco e labels acessíveis.
//
// O ciclo de Tab fica aqui como função PURA, para ser coberta por teste sem
// jsdom: o componente só captura o evento e devolve o índice calculado.

// Elementos que participam do Tab. Seletor sem `:not([inert])` de propósito:
// quem controla o foco (useFocusTrap) esconde o resto da página com `inert`,
// então tudo o que está dentro do painel é focável.
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

// Um elemento só recebe foco se estiver visível. `getClientRects()` é vazio
// para `display: none` e para nós desconectados — sem ele, um botão escondido
// por CSS (o rótulo "Ler todas" some abaixo de 420px) consumiria o Tab sem dar
// sinal de foco ao usuário.
export function isFocusableElement(el) {
  if (!el || typeof el.getClientRects !== 'function') return false;
  if (el.disabled || el.getAttribute?.('aria-hidden') === 'true') return false;
  if (el.closest?.('[inert]')) return false;
  return el.getClientRects().length > 0;
}

// Lista dos focáveis de `container`, na ordem do DOM.
export function getFocusableElements(container) {
  if (!container?.querySelectorAll) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(isFocusableElement);
}

// Próximo índice de foco com Tab/Shift+Tab cíclico dentro de `count` itens.
// `current === -1` significa "o foco não está em nenhum item do painel": o Tab
// leva ao primeiro e o Shift+Tab ao último, em vez de escapar pela página.
export function nextFocusIndex({ current, count, shift = false }) {
  if (!Number.isInteger(count) || count <= 0) return -1;
  const from = Number.isInteger(current) && current >= 0 && current < count ? current : -1;
  if (shift) return from <= 0 ? count - 1 : from - 1;
  return from === -1 || from === count - 1 ? 0 : from + 1;
}

// Trap aplicado ao documento enquanto o painel está aberto:
// - esconde o resto da página com `inert` (o conteúdo de fundo sai da ordem
//   de tabulação e das árvores de acessibilidade);
// - leva o foco para dentro do painel ao abrir;
// - cicla Tab/Shift+Tab no painel;
// - ao fechar, devolve o foco ao gatilho e restaura o estado anterior de
//   `inert` (dois painéis nunca ficam abertos ao mesmo tempo, mas restaurar o
//   valor original evita desfazer um `inert` que já existia).
//
// Aplicado via hook em useFocusTrap.js; mantido separado para não puxar React
// para um arquivo de funções puras.
export function activateFocusTrap({ container, returnFocusTo }) {
  if (typeof document === 'undefined' || !container) return () => {};

  const previousActive = document.activeElement;
  const touched = [];

  // Sobe do container até o <body>, marcando cada irmão como inerte.
  let node = container;
  while (node && node !== document.body && node.parentElement) {
    for (const sibling of Array.from(node.parentElement.children)) {
      if (sibling === node || !sibling.tagName) continue;
      if (sibling.tagName === 'SCRIPT' || sibling.tagName === 'STYLE') continue;
      const wasInert = sibling.hasAttribute('inert');
      const hadAriaHidden = sibling.hasAttribute('aria-hidden');
      touched.push({ sibling, wasInert, hadAriaHidden });
      sibling.setAttribute('inert', '');
      sibling.setAttribute('aria-hidden', 'true');
    }
    node = node.parentElement;
  }

  const focusFirst = () => {
    const [first] = getFocusableElements(container);
    if (first) first.focus();
    else if (typeof container.focus === 'function') container.focus();
  };
  focusFirst();

  const onKeyDown = (event) => {
    if (event.key !== 'Tab') return;
    const items = getFocusableElements(container);
    if (items.length === 0) {
      event.preventDefault();
      return;
    }
    const current = items.indexOf(document.activeElement);
    const target = nextFocusIndex({ current, count: items.length, shift: event.shiftKey });
    // Com o alvo igual à posição atual o navegador ainda manteria o foco na
    // página de fundo; sempre reposicionamos explicitamente.
    event.preventDefault();
    items[target].focus();
  };

  document.addEventListener('keydown', onKeyDown, true);

  return () => {
    document.removeEventListener('keydown', onKeyDown, true);
    for (const { sibling, wasInert, hadAriaHidden } of touched) {
      if (!wasInert) sibling.removeAttribute('inert');
      if (!hadAriaHidden) sibling.removeAttribute('aria-hidden');
    }
    const back = returnFocusTo?.current || previousActive;
    if (back && typeof back.focus === 'function' && back.isConnected !== false) {
      back.focus();
    }
  };
}

// Rótulo do select de status de cada linha da lista. O mesmo padrão pode
// aparecer em várias linhas, então o título entra no nome acessível: um leitor
// de tela anuncia o recorte correto, não só "Status".
export function buildTicketSelectLabel(field, ticket) {
  const fieldLabel = field === 'agentId' ? 'Responsável' : 'Status';
  const id = ticket?.id ? ` #${String(ticket.id).slice(-6)}` : '';
  const title = ticket?.title ? ` — ${ticket.title}` : '';
  return `${fieldLabel}${id}${title}`;
}
