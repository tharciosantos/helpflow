import { afterEach, describe, expect, it } from 'vitest';
import {
  activateFocusTrap,
  buildTicketSelectLabel,
  getFocusableElements,
  isFocusableElement,
  nextFocusIndex,
} from '../focusTrap';

// A suíte roda em `node` (sem jsdom). Estes testes montam o mínimo do DOM que o
// trap toca: selectorAll/filter/getClientRects e as árvores de pai. O que fica
// coberto é a LÓGICA (ciclo do Tab, visibilidade, inert, restauração); o
// comportamento real no navegador fica com o Cypress.

// `closest` tem de existir em todo nó: isFocusableElement chama
// `el.closest('[inert]')` com optional chaining.
const notInert = () => null;

function fakeElement({ tag = 'BUTTON', visible = true, attrs = {}, parent = null, children = [] } = {}) {
  const el = {
    tagName: tag,
    disabled: false,
    parentElement: parent,
    children,
    closest: notInert,
    focusCount: 0,
    attributes: { ...attrs },
    getAttribute(name) {
      return this.attributes[name] ?? null;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    removeAttribute(name) {
      delete this.attributes[name];
    },
    hasAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name);
    },
    getClientRects() {
      return visible ? [{ width: 1, height: 1 }] : [];
    },
    focus() {
      this.focusCount += 1;
      doc.activeElement = this;
    },
    querySelectorAll(selector) {
      // O seletor real não importa para a lógica: a árvore fake lista os
      // focáveis em ordem de DOM.
      expect(selector).toContain('button');
      return children;
    },
    isConnected: true,
  };
  return el;
}

let doc;

function buildDocument({ panelChildren }) {
  const body = fakeElement({ tag: 'BODY' });
  const background = fakeElement({ tag: 'MAIN', parent: body });
  const portal = fakeElement({ tag: 'DIV', parent: body, children: panelChildren });
  background.isConnected = true;
  body.children = [background, portal];
  doc = {
    body,
    activeElement: background,
    listeners: [],
    addEventListener(type, handler, capture) {
      this.listeners.push({ type, handler, capture });
    },
    removeEventListener(type, handler) {
      this.listeners = this.listeners.filter((l) => !(l.type === type && l.handler === handler));
    },
  };
  globalThis.document = doc;
  return { body, background, portal };
}

function dispatchTab({ shift = false } = {}) {
  const listener = doc.listeners.find((l) => l.type === 'keydown');
  let prevented = false;
  listener.handler({
    key: 'Tab',
    shiftKey: shift,
    preventDefault() {
      prevented = true;
    },
  });
  return prevented;
}

afterEach(() => {
  delete globalThis.document;
});

describe('isFocusableElement', () => {
  it('aceita elemento visível', () => {
    expect(isFocusableElement(fakeElement({ visible: true }))).toBe(true);
  });

  it('recusa elemento invisível (display:none/desconectado)', () => {
    expect(isFocusableElement(fakeElement({ visible: false }))).toBe(false);
  });

  it('recusa desabilitado e aria-hidden', () => {
    const disabled = fakeElement();
    disabled.disabled = true;
    expect(isFocusableElement(disabled)).toBe(false);

    expect(isFocusableElement(fakeElement({ attrs: { 'aria-hidden': 'true' } }))).toBe(false);
  });

  it('recusa conteúdo de um trap aberto por cima (inert)', () => {
    // O fundo da página fica inert durante o trap; um painel aninhado não pode
    // roubar o Tab de um painel que já está por cima.
    const insideInert = fakeElement();
    insideInert.closest = (selector) => (selector === '[inert]' ? insideInert : null);
    expect(isFocusableElement(insideInert)).toBe(false);
  });

  it('é tolerante a nulo', () => {
    expect(isFocusableElement(null)).toBe(false);
    expect(isFocusableElement(undefined)).toBe(false);
  });
});

describe('getFocusableElements', () => {
  it('filtra os invisíveis mantendo a ordem do DOM', () => {
    const first = fakeElement();
    const hidden = fakeElement({ visible: false });
    const last = fakeElement();
    const container = { querySelectorAll: () => [first, hidden, last] };
    expect(getFocusableElements(container)).toEqual([first, last]);
  });

  it('devolve lista vazia sem container', () => {
    expect(getFocusableElements(null)).toEqual([]);
  });
});

describe('nextFocusIndex', () => {
  it('anda para frente com Tab e volta no fim', () => {
    expect(nextFocusIndex({ current: 0, count: 3 })).toBe(1);
    expect(nextFocusIndex({ current: 1, count: 3 })).toBe(2);
    expect(nextFocusIndex({ current: 2, count: 3 })).toBe(0);
  });

  it('anda para trás com Shift+Tab e volta no começo', () => {
    expect(nextFocusIndex({ current: 2, count: 3, shift: true })).toBe(1);
    expect(nextFocusIndex({ current: 0, count: 3, shift: true })).toBe(2);
  });

  it('fora do painel (-1): Tab leva ao primeiro e Shift+Tab ao último', () => {
    expect(nextFocusIndex({ current: -1, count: 3 })).toBe(0);
    expect(nextFocusIndex({ current: -1, count: 3, shift: true })).toBe(2);
    expect(nextFocusIndex({ current: 99, count: 3 })).toBe(0);
  });

  it('sem focáveis devolve -1', () => {
    expect(nextFocusIndex({ current: 0, count: 0 })).toBe(-1);
    expect(nextFocusIndex({ current: 0, count: Number.NaN })).toBe(-1);
  });
});

describe('activateFocusTrap', () => {
  it('foca o primeiro focável ao abrir e marca o fundo como inert', () => {
    const close = fakeElement();
    const confirm = fakeElement();
    const { background, portal } = buildDocument({ panelChildren: [close, confirm] });

    const cleanup = activateFocusTrap({ container: portal, returnFocusTo: null });

    expect(doc.activeElement).toBe(close);
    expect(background.hasAttribute('inert')).toBe(true);
    expect(background.getAttribute('aria-hidden')).toBe('true');
    expect(portal.hasAttribute('inert')).toBe(false);

    cleanup();
  });

  it('cicia o Tab dentro do painel e impede o Tab de sair', () => {
    const a = fakeElement();
    const b = fakeElement();
    const { portal } = buildDocument({ panelChildren: [a, b] });
    const cleanup = activateFocusTrap({ container: portal, returnFocusTo: null });

    a.focus();
    expect(dispatchTab()).toBe(true);
    expect(doc.activeElement).toBe(b);

    expect(dispatchTab()).toBe(true);
    expect(doc.activeElement).toBe(a);

    expect(dispatchTab({ shift: true })).toBe(true);
    expect(doc.activeElement).toBe(b);

    cleanup();
  });

  it('quando há um único focável, o Tab não sai dele', () => {
    const only = fakeElement();
    const { portal } = buildDocument({ panelChildren: [only] });
    const cleanup = activateFocusTrap({ container: portal, returnFocusTo: null });

    expect(dispatchTab()).toBe(true);
    expect(doc.activeElement).toBe(only);
    expect(dispatchTab({ shift: true })).toBe(true);
    expect(doc.activeElement).toBe(only);

    cleanup();
  });

  it('ignora outras teclas', () => {
    const only = fakeElement();
    const { portal } = buildDocument({ panelChildren: [only] });
    const cleanup = activateFocusTrap({ container: portal, returnFocusTo: null });

    const listener = doc.listeners.find((l) => l.type === 'keydown');
    let prevented = false;
    listener.handler({ key: 'Escape', preventDefault() { prevented = true; } });
    expect(prevented).toBe(false);

    cleanup();
  });

  it('no cleanup devolve o foco ao gatilho, restaura o inert e remove o listener', () => {
    const close = fakeElement();
    const trigger = fakeElement();
    const { background, portal } = buildDocument({ panelChildren: [close] });
    // O gatilho simula o próprio botão do sino no documento.
    const cleanup = activateFocusTrap({ container: portal, returnFocusTo: { current: trigger } });

    cleanup();

    expect(doc.activeElement).toBe(trigger);
    expect(background.hasAttribute('inert')).toBe(false);
    expect(background.hasAttribute('aria-hidden')).toBe(false);
    expect(doc.listeners).toHaveLength(0);
  });

  it('preserva um inert que já existia antes do trap', () => {
    const close = fakeElement();
    const { background, portal } = buildDocument({ panelChildren: [close] });
    background.setAttribute('inert', '');
    background.setAttribute('aria-hidden', 'true');

    const cleanup = activateFocusTrap({ container: portal, returnFocusTo: null });
    cleanup();

    expect(background.hasAttribute('inert')).toBe(true);
    expect(background.getAttribute('aria-hidden')).toBe('true');
  });

  it('sem focáveis, o próprio container recebe foco e o Tab é bloqueado', () => {
    const portal = fakeElement({ tag: 'DIV' });
    const body = fakeElement({ tag: 'BODY' });
    body.children = [portal];
    doc = {
      body,
      activeElement: body,
      listeners: [],
      addEventListener(type, handler) { this.listeners.push({ type, handler }); },
      removeEventListener(type, handler) { this.listeners = this.listeners.filter((l) => l.handler !== handler); },
    };
    globalThis.document = doc;

    const cleanup = activateFocusTrap({ container: portal, returnFocusTo: null });
    expect(doc.activeElement).toBe(portal);
    expect(dispatchTab()).toBe(true);
    cleanup();
  });

  it('sem documento ou sem container não faz nada e devolve um noop', () => {
    const cleanup = activateFocusTrap({ container: null });
    expect(typeof cleanup).toBe('function');
    expect(() => cleanup()).not.toThrow();
  });
});

describe('buildTicketSelectLabel', () => {
  const ticket = { id: 'cmn75rp5h0001ky04nk3va1gx', title: 'Impressora sem tinta' };

  it('identifica o campo e o chamado pelo recorte do id', () => {
    expect(buildTicketSelectLabel('status', ticket)).toBe('Status #3va1gx — Impressora sem tinta');
  });

  it('usa "Responsável" para o select de atribuição', () => {
    expect(buildTicketSelectLabel('agentId', ticket)).toBe('Responsável #3va1gx — Impressora sem tinta');
  });

  it('sem título ou id ainda gera um rótulo válido', () => {
    expect(buildTicketSelectLabel('status', { id: 'abc123' })).toBe('Status #abc123');
    expect(buildTicketSelectLabel('status', null)).toBe('Status');
  });
});
