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
      })
        // `.then`, não `.its(...).should(...)`: o should é sincrônico sobre um
        // snapshot da fila e continuava com o request do GET seguinte, então a
        // espera de 1,5 s não chegava a acontecer antes do segundo PATCH.
        .then((response) => expect(response.status).to.eq(200));

      // Agente B ainda está com o `original.updatedAt`. A espera garantiu o 409
      // na época da janela simétrica (±1 s); hoje a janela é `[expected - 1s,
      // expected]`, então a escrita de A já seria recusada mesmo no mesmo
      // segundo. A espera permanece para cobrir a folga para trás.
      cy.wait(1500);
      cy.request({
        method: 'PATCH',
        url: `/api/tickets/${original.id}`,
        body: { status: 'CLOSED', expectedUpdatedAt: original.updatedAt },
        failOnStatusCode: false,
      }).then((conflict) => {
        expect(
          conflict.status,
          `esperado 409; estado atual: ${conflict.body.current?.status}`
        ).to.eq(409);
      });

      // Um segundo PATCH sem `expectedUpdatedAt` (ou com 409, o cliente
      // recarrega e reenvia) deve ser recusado pelo estado atual: A gravou
      // IN_PROGRESS e o agente B tenta fechar com o `original.updatedAt`.
      cy.request({
        method: 'PATCH',
        url: `/api/tickets/${original.id}`,
        body: { status: 'CLOSED', expectedUpdatedAt: original.updatedAt },
        failOnStatusCode: false,
      }).then((second) => {
        expect(
          second.status,
          `segundo PATCH: esperado 409; estado atual: ${second.body.current?.status}`
        ).to.eq(409);
        expect(second.body.message).to.match(/alterado por outra pessoa/i);
        // O corpo do conflito traz o estado atual para a UI se reconciliar.
        expect(second.body.current).to.be.an('object');
        expect(second.body.current.status).to.eq('IN_PROGRESS');
      });

      // A alteração de A não foi sobrescrita pela de B.
      cy.request({ method: 'GET', url: `/api/tickets/${original.id}` }).then((response) => {
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

  it('envia expectedUpdatedAt nas ações rápidas da lista e reconcilia no 409', () => {
    const title = `Concorrência lista ${Date.now()}`;

    createTicket(title).then((original) => {
      // Outra pessoa altera o chamado e o dashboard ainda tem a versão antiga.
      cy.request({
        method: 'PATCH',
        url: `/api/tickets/${original.id}`,
        body: { status: 'IN_PROGRESS', expectedUpdatedAt: original.updatedAt },
      }).then((response) => expect(response.status).to.eq(200));

      cy.visit('/dashboard');
      cy.contains(title, { timeout: 15000 }).scrollIntoView();

      cy.intercept('PATCH', `/api/tickets/${original.id}`).as('listPatch');

      cy.get(`[data-cy="ticket-card-${original.id}"] select`).first().select('CLOSED');

      cy.wait('@listPatch').then(({ request, response }) => {
        // A lista passou a mandar o updatedAt que carregou...
        expect(request.body.expectedUpdatedAt).to.eq(original.updatedAt);
        // ...e a escrita foi recusada em vez de sobrescrever a alteração.
        expect(response.statusCode).to.eq(409);
      });

      // O card mostra a versão do servidor e o usuário é avisado.
      cy.get(`[data-cy="ticket-card-${original.id}"] select`)
        .first()
        .should('have.value', 'IN_PROGRESS');
      cy.contains('alterado por outra pessoa').should('be.visible');
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
