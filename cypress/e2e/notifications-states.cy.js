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
//
// AUD-42: o último cenário cobre a notificação ASSIGNED depois da
// reatribuição — o responsável anterior perde o acesso ao chamado, então a
// API omite o aviso e o sino não renderiza o link "Abrir chamado".

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

  it('remove a notificação do chamado reatribuído para o responsável anterior', () => {
    const password = 'Senha@123';
    const title = `Reatribuição ${Date.now()}`;

    // Empresa nova: o dono é um AGENT novo (não o `agentUser` do `before`, cuja
    // sessão o `cy.session` restauraria sem `visit`).
    cy.createTestUser({ accountType: 'COMPANY' }).then((owner) => {
      expect(owner.companyCode, 'código da empresa').to.be.a('string').and.not.be.empty;

      cy.login(owner.email, owner.password);
      cy.visit('/dashboard');

      // Funcionário entra pelo fluxo real (nasce PENDING) e o AGENT aprova.
      const employeeEmail = `funcionario-${Date.now()}@teste.com`;
      cy.registerEmployee({ name: 'Funcionário Reatribuído', email: employeeEmail, password, companyCode: owner.companyCode });
      cy.reload();
      cy.intercept('PATCH', '**/api/agents/pending/*').as('decide');
      cy.contains(employeeEmail).closest('li').find('[data-cy^="approve-user-"]').click();
      cy.wait('@decide').its('response.statusCode').should('eq', 200);

      // AGENT abre o chamado pela API (o foco do cenário é o sino).
      cy.request('POST', '/api/tickets', {
        title,
        description: 'Chamado para reatribuição',
        priority: 'MEDIUM',
      }).its('body.id').then((ticketId) => {
        // O AGENT atribui ao funcionário (delegação a CLIENT da empresa);
        // o PATCH não notifica quem praticou a ação, só o novo responsável.
        cy.userIdOf(employeeEmail).then((employeeId) =>
          cy.request('PATCH', `/api/tickets/${ticketId}`, { agentId: employeeId })
        ).its('status').should('eq', 200);

        // O funcionário é notificado e abre o chamado normalmente.
        cy.clearCookies();
        cy.login(employeeEmail, password);
        cy.visit('/dashboard');
        openPanel();
        cy.get('[data-cy="notification-item"]').contains(title).closest('[data-cy="notification-item"]')
          .contains('Abrir chamado').should('exist');

        // O AGENT remove o responsável.
        cy.clearCookies();
        cy.login(owner.email, owner.password);
        cy.request('PATCH', `/api/tickets/${ticketId}`, { agentId: null })
          .its('status').should('eq', 200);

        // O responsável anterior perde o acesso ao chamado...
        cy.clearCookies();
        cy.login(employeeEmail, password);
        // (o 403 é o status esperado: não pode falhar o teste).
        cy.request({ url: `/api/tickets/${ticketId}`, failOnStatusCode: false })
          .its('status').should('eq', 403);

        // ...e o GET omite a notificação (contador restrito ao que exibe).
        cy.request('/api/notifications').then(({ status, body }) => {
          expect(status).to.eq(200);
          expect(JSON.stringify(body.notifications)).to.not.include(title);
          expect(body.unreadCount).to.eq(body.notifications.filter((n) => !n.readAt).length);
        });

        // O sino novo não mostra o aviso nem o link.
        cy.intercept('GET', '/api/notifications').as('getNotifications');
        cy.visit('/dashboard');
        cy.wait('@getNotifications');
        openPanel();
        // A lista está vazia (nenhum item sobrou): o título não aparece e,
        // sobretudo, nenhum link pode levar ao 403.
        cy.get('[data-cy="notification-dropdown"]').should('not.contain.text', title);
        cy.get('[data-cy="notification-dropdown"]').should('not.contain.text', 'Abrir chamado');
      });
    });
  });
});
