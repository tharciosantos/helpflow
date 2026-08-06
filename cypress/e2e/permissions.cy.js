// cypress/e2e/permissions.cy.js
//
// Por que criamos os usuários dinamicamente?
// → Os testes de Cypress rodam contra um banco de dados real.
//   Se tentarmos logar com 'client@test.com' e esse usuário não existir
//   no banco, o NextAuth retorna 401 e o teste falha no beforeEach.
//   A solução é criar os usuários na hora, via cy.createTestUser().

describe('Testes de Permissão', () => {

  // ─────────────────────────────────────────────
  // Cenário 1: CLIENT só vê os próprios tickets
  // ─────────────────────────────────────────────
  describe('CLIENT - acesso restrito aos próprios tickets', () => {
    let clientUser;

    before(() => {
      // Cria o usuário CLIENT uma vez para toda a suite
      cy.createTestUser({ role: 'CLIENT' }).then((user) => {
        clientUser = user;
      });
    });

    beforeEach(() => {
      // Faz login com o usuário criado
      cy.login(clientUser.email, clientUser.password);
    });

    it('deve ver apenas os próprios tickets no dashboard', () => {
      // cy.intercept precisa ser registrado ANTES do visit
      cy.intercept('GET', '/api/tickets*').as('getTickets');
      cy.visit('/dashboard');
      cy.wait('@getTickets').then((interception) => {
        expect(interception.response.statusCode).to.equal(200);
        // A resposta agora é { tickets, pagination } (paginação implementada)
        expect(interception.response.body).to.have.property('tickets');
        expect(interception.response.body).to.have.property('pagination');
      });
    });
  });

  describe('Matriz proprietário e não proprietário', () => {
    let owner;
    let otherClient;
    let ticketId;

    before(() => {
      cy.createTestUser({ role: 'CLIENT' }).then((user) => {
        owner = user;
        cy.login(owner.email, owner.password);
        cy.request('POST', '/api/tickets', {
          title: 'Ticket para testar autorização',
          description: 'Criado automaticamente pela suíte de permissões.',
          priority: 'MEDIUM',
        }).then((response) => {
          ticketId = response.body.id;
        });
      });
      cy.createTestUser({ role: 'CLIENT' }).then((user) => {
        otherClient = user;
      });
    });

    it('bloqueia alteração manipulada de status pelo CLIENT proprietário', () => {
      cy.login(owner.email, owner.password);
      cy.request({
        method: 'PATCH',
        url: `/api/tickets/${ticketId}`,
        body: { status: 'CLOSED' },
        failOnStatusCode: false,
      }).its('status').should('equal', 403);
    });

    it('bloqueia leitura, edição e exclusão por CLIENT não proprietário', () => {
      cy.login(otherClient.email, otherClient.password);
      ['GET', 'DELETE'].forEach((method) => {
        cy.request({ method, url: `/api/tickets/${ticketId}`, failOnStatusCode: false })
          .its('status').should('equal', 403);
      });
      cy.request({
        method: 'PATCH',
        url: `/api/tickets/${ticketId}`,
        body: { title: 'Tentativa de edição indevida' },
        failOnStatusCode: false,
      }).its('status').should('equal', 403);
    });
  });

  // ─────────────────────────────────────────────
  // Cenário 2: Acesso sem autenticação
  // ─────────────────────────────────────────────
  describe('Acesso sem autenticação', () => {
    it('deve retornar 401 ao chamar API de tickets sem sessão', () => {
      cy.request({
        method: 'GET',
        url: '/api/tickets',
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.equal(401);
      });
    });

    it('deve retornar 401 ao tentar criar ticket sem sessão', () => {
      cy.request({
        method: 'POST',
        url: '/api/tickets',
        body: { title: 'Teste de invasão', description: 'Tentativa sem autenticação' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.equal(401);
      });
    });

    it('deve redirecionar para login ao visitar dashboard sem sessão', () => {
      cy.visit('/dashboard');
      cy.url().should('not.include', '/dashboard');
    });
  });

  // ─────────────────────────────────────────────
  // Cenário 3: AGENT tem acesso ampliado
  // ─────────────────────────────────────────────
  describe('AGENT - acesso ampliado', () => {
    let agentUser;

    before(() => {
      // Cria um usuário AGENT (requer CYPRESS_TEST_SECRET no .env)
      cy.createTestUser({ role: 'AGENT' }).then((user) => {
        agentUser = user;
      });
    });

    beforeEach(() => {
      cy.login(agentUser.email, agentUser.password);
    });

    it('deve acessar o dashboard sem erros', () => {
      cy.visit('/dashboard');
      cy.contains('Olá').should('be.visible');
    });

    it('deve conseguir ver a listagem de tickets sem erro 401', () => {
      cy.intercept('GET', '/api/tickets*').as('getTickets');
      cy.visit('/dashboard');
      cy.wait('@getTickets').then((interception) => {
        expect(interception.response.statusCode).to.equal(200);
      });
    });
  });
});
