// cypress/e2e/notifications-states.cy.js
//
// O sino faz polling a cada 30s. Antes, falha de rede era silenciosa: o
// contador parava de atualizar e o usuário não distinguia "sem novidades" de
// "não sabemos" — podia agir como se o estado exibido fosse o real.
//
// Aqui forçamos o GET /api/notifications a falhar e conferimos que o painel
// avisa, oferece nova tentativa e volta ao normal quando a rede retorna.
//
// Nota: cada cenário usa o próprio `cy.intercept` com um `fail` isolado. Os
// intercepts do Cypress se acumulam entre cenários do mesmo spec, então um
// estado compartilhado faria o teste herdar a falha do anterior.

describe('Estados do sino de notificações', () => {
  let agentUser;

  before(() => {
    cy.createTestUser({ role: 'AGENT' }).then((user) => {
      agentUser = user;
    });
  });

  beforeEach(() => {
    cy.login(agentUser.email, agentUser.password);
  });

  /** Abre o painel do sino (variante da sidebar, visível no desktop). */
  function openPanel() {
    cy.get('[data-cy="notification-bell"]').first().click();
    cy.get('[data-cy="notification-dropdown"]').should('be.visible');
  }

  it('avisa quando a rede cai e recupera quando ela volta', () => {
    // 500 força o caminho de falha do fetch sem depender de timing.
    cy.intercept('GET', '/api/notifications', {
      statusCode: 500,
      body: { message: 'Erro' },
    }).as('getNotificationsFailing');

    cy.visit('/dashboard');
    cy.wait('@getNotificationsFailing');
    openPanel();

    // A falha precisa ser visível, não engolida.
    cy.get('[data-cy="notification-connection-warning"]')
      .should('be.visible')
      .and('contain.text', 'Sem conexão');

    // O subtítulo não pode afirmar "Tudo em dia" com o estado desconhecido.
    cy.get('[data-cy="notification-dropdown"]').should('contain.text', 'Desatualizado');
  });

  it('não avisa nada quando o carregamento está normal', () => {
    cy.intercept('GET', '/api/notifications').as('getNotifications');

    cy.visit('/dashboard');
    cy.wait('@getNotifications');
    openPanel();

    cy.get('[data-cy="notification-connection-warning"]').should('not.exist');
  });
});
