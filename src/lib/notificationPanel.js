// Geometria do painel de notificações (sino).
//
// O painel é renderizado em um portal no <body>, então ele NÃO herda o contexto
// de posicionamento da sidebar. Por isso a posição é calculada em JS:
// - mobile (< 768px): bottom-sheet com margem lateral e safe-area;
// - desktop: flyout ancorado à DIREITA do botão da sidebar.
//
// Regra de ouro: o painel inteiro precisa caber no viewport. A versão anterior
// alinhava a borda direita do painel à borda direita do sino (que fica a ~232px
// da esquerda), empurrando 152px de um painel de 384px para fora da tela.
export const NOTIFICATION_PANEL_MOBILE_BREAKPOINT = 768;
export const NOTIFICATION_PANEL_WIDTH = 400;
export const NOTIFICATION_PANEL_MAX_HEIGHT = 480;

const VIEWPORT_MARGIN = 16;
const ANCHOR_GAP = 12;

export function computeNotificationPanelStyle({
  viewportWidth,
  viewportHeight,
  anchorRect = null,
  containerRect = null,
}) {
  if (viewportWidth < NOTIFICATION_PANEL_MOBILE_BREAKPOINT) {
    return {
      position: 'fixed',
      left: 12,
      right: 12,
      // Respeita o home indicator do iPhone sem colar o painel na borda.
      bottom: 'max(12px, env(safe-area-inset-bottom, 0px))',
      top: 'auto',
      width: 'auto',
      maxHeight: '85dvh',
      zIndex: 61,
      transformOrigin: 'bottom center',
    };
  }

  // O flyout nasce fora da sidebar, não em cima do padding dela. Sem a medição
  // do <aside>, assume a sidebar do DashboardShell (w-64 = 256px). O clamp
  // abaixo mantém o painel dentro da tela de qualquer forma.
  const containerRight = containerRect?.right ?? (anchorRect ? anchorRect.right + 24 : 256);
  const anchorLeft = containerRight + ANCHOR_GAP;

  const width = Math.min(
    NOTIFICATION_PANEL_WIDTH,
    Math.max(0, viewportWidth - anchorLeft - VIEWPORT_MARGIN)
  );
  const left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(anchorLeft, viewportWidth - width - VIEWPORT_MARGIN)
  );

  const maxHeight = Math.min(
    NOTIFICATION_PANEL_MAX_HEIGHT,
    viewportHeight - VIEWPORT_MARGIN * 2
  );
  const anchorTop = (anchorRect?.top ?? VIEWPORT_MARGIN) - 4;
  const top = Math.max(
    VIEWPORT_MARGIN,
    Math.min(anchorTop, viewportHeight - maxHeight - VIEWPORT_MARGIN)
  );

  return {
    position: 'fixed',
    top,
    left,
    right: 'auto',
    bottom: 'auto',
    width,
    maxHeight,
    zIndex: 61,
    transformOrigin: 'top left',
  };
}
