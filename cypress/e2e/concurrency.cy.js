// cypress/e2e/concurrency.cy.js
//
// Verifica o controle de concorrência otimista do PATCH /api/tickets/[id].
//
// Cenário real protegido: dois agentes abrem o mesmo chamado; o primeiro grava
// e o segundo, sem saber, sobrescrevia a alteração do primeiro em silêncio.
// Com `expectedUpdatedAt`, o segundo recebe 409 em vez de perder o dado.

describe('Concorrência no PATCH do chamado', () => {
  let agentUser;

  before(() => {
    cy.createTestUser({ role: 'AGENT' }).then((user) => {
      agentUser = user;
    });
  });

  beforeEach(() => {
    cy.login(agentUser.email, agentUser.password);
  });

  /** Cria um chamado via API e devolve o registro criado. */
  function createTicket(title) {
    return cy.request({
      method: 'POST',
      url: '/api/tickets',
      body: { title, description: 'Chamado para teste de concorrência', priority: 'LOW' },
    }).then((response) => {
      expect(response.status).to.eq(201);
      return response.body;
    });
  }

  it('aplica a escrita quando o updatedAt enviado é o atual', () => {
    const title = `Concorrência ok ${Date.now()}`;

    createTicket(title).then((ticket) => {
      cy.request({
        method: 'PATCH',
        url: `/api/tickets/${ticket.id}`,
        body: { status: 'IN_PROGRESS', expectedUpdatedAt: ticket.updatedAt },
      }).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.status).to.eq('IN_PROGRESS');
      });
    });
  });

  it('responde 409 e preserva a primeira alteração quando o chamado mudou', () => {
    const title = `Concorrência conflito ${Date.now()}`;

    createTicket(title).then((original) => {
      // Agente A grava primeiro.
      cy.request({
        method: 'PATCH',
        url: `/api/tickets/${original.id}`,
        body: { status: 'IN_PROGRESS', expectedUpdatedAt: original.updatedAt },
      }).its('status').should('eq', 200);

      // Agente B ainda está com o `original.updatedAt`. A espera garante que a
      // escrita de A já esteja FORA da janela de tolerância (±1 s): sem ela o
      // agente A em CI grava em menos de 1 s e o 409 não seria detectado.
      cy.wait(1500);
      cy.request({
        method: 'PATCH',
        url: `/api/tickets/${original.id}`,
        body: { status: 'CLOSED', expectedUpdatedAt: original.updatedAt },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.eq(409);
        expect(response.body.message).to.match(/alterado por outra pessoa/i);
        // O corpo do conflito traz o estado atual para a UI se reconciliar.
        expect(response.body.current).to.be.an('object');
        expect(response.body.current.status).to.eq('IN_PROGRESS');
      });

      // A alteração de A não foi sobrescrita pela de B.
      cy.request(`/api/tickets/${original.id}`).then((response) => {
        expect(response.body.status).to.eq('IN_PROGRESS');
      });
    });
  });

  it('aceita a edição feita segundos depois de carregar o chamado', () => {
    const title = `Concorrência atravessou ${Date.now()}`;

    createTicket(title).then((ticket) => {
      cy.wait(1500);
      cy.request({
        method: 'PATCH',
        url: `/api/tickets/${ticket.id}`,
        body: { status: 'IN_PROGRESS', expectedUpdatedAt: ticket.updatedAt },
      }).then((response) => {
        // O updatedAt do cliente é o mesmo: ninguém mais escreveu. Antes do
        // where com janela, o tempo decorrido provocava 409 falso.
        expect(response.status).to.eq(200);
        expect(response.body.status).to.eq('IN_PROGRESS');
      });
    });
  });

  it('mantém compatibilidade quando expectedUpdatedAt não é enviado', () => {
    const title = `Concorrência legado ${Date.now()}`;

    createTicket(title).then((ticket) => {
      cy.request({
        method: 'PATCH',
        url: `/api/tickets/${ticket.id}`,
        body: { status: 'IN_PROGRESS' },
      }).then((response) => {
        // Clientes antigos continuam funcionando, sem proteção otimista.
        expect(response.status).to.eq(200);
      });
    });
  });

  it('ignora expectedUpdatedAt inválido em vez de falhar com 500', () => {
    const title = `Concorrência inválido ${Date.now()}`;

    createTicket(title).then((ticket) => {
      cy.request({
        method: 'PATCH',
        url: `/api/tickets/${ticket.id}`,
        body: { status: 'IN_PROGRESS', expectedUpdatedAt: 'não é uma data' },
      }).then((response) => {
        expect(response.status).to.eq(200);
      });
    });
  });
});
