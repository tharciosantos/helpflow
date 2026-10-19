import { describe, it, expect } from 'vitest';
import {
  computeNotificationPanelStyle,
  NOTIFICATION_PANEL_MOBILE_BREAKPOINT,
  NOTIFICATION_PANEL_WIDTH,
} from '../notificationPanel';

// Sino da sidebar: 208px de conteúdo + 24px de padding = borda direita em 232px.
// A sidebar (aside) termina em 256px.
const sidebarBell = { right: 232, top: 184, height: 40 };
const sidebar = { right: 256 };

function expectInsideViewport(style, viewportWidth, viewportHeight) {
  expect(style.position).toBe('fixed');
  expect(style.left).toBeGreaterThanOrEqual(16);
  expect(style.left + style.width).toBeLessThanOrEqual(viewportWidth - 16);
  expect(style.top).toBeGreaterThanOrEqual(16);
  expect(style.top + style.maxHeight).toBeLessThanOrEqual(viewportHeight - 16);
}

describe('computeNotificationPanelStyle', () => {
  it('abre à direita da sidebar em FHD (1920x1080)', () => {
    const style = computeNotificationPanelStyle({
      viewportWidth: 1920,
      viewportHeight: 1080,
      anchorRect: sidebarBell,
      containerRect: sidebar,
    });

    expect(style.width).toBe(NOTIFICATION_PANEL_WIDTH);
    expect(style.left).toBe(268); // borda da sidebar (256) + gap de 12
    expect(style.right).toBe('auto'); // nunca ancora pela direita
    expect(style.top).toBe(180); // alinhado ao topo do sino
    expectInsideViewport(style, 1920, 1080);
  });

  it('não corta o painel em 1366x768', () => {
    const style = computeNotificationPanelStyle({
      viewportWidth: 1366,
      viewportHeight: 768,
      anchorRect: sidebarBell,
      containerRect: sidebar,
    });

    expect(style.left).toBe(268);
    expect(style.left + style.width).toBe(668);
    expectInsideViewport(style, 1366, 768);
  });

  it('mantém o painel dentro da tela logo acima do breakpoint (768x600)', () => {
    const style = computeNotificationPanelStyle({
      viewportWidth: NOTIFICATION_PANEL_MOBILE_BREAKPOINT,
      viewportHeight: 600,
      anchorRect: sidebarBell,
      containerRect: sidebar,
    });

    expect(style.width).toBe(NOTIFICATION_PANEL_WIDTH);
    expect(style.top).toBe(104); // clamp vertical: 600 - 480 - 16
    expectInsideViewport(style, 768, 600);
  });

  it('usa fallback quando o sino ainda não foi medido', () => {
    const style = computeNotificationPanelStyle({
      viewportWidth: 1440,
      viewportHeight: 900,
    });

    expect(style.left).toBe(268);
    expect(style.top).toBe(16);
    expectInsideViewport(style, 1440, 900);
  });

  it('vira bottom-sheet com safe-area no mobile', () => {
    const style = computeNotificationPanelStyle({
      viewportWidth: 390,
      viewportHeight: 844,
      anchorRect: sidebarBell,
      containerRect: sidebar,
    });

    expect(style.left).toBe(12);
    expect(style.right).toBe(12);
    expect(style.width).toBe('auto');
    expect(style.top).toBe('auto');
    expect(style.bottom).toContain('safe-area-inset-bottom');
    expect(style.maxHeight).toBe('85dvh');
  });
});
