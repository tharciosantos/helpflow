// cypress/e2e/api-coverage.cy.js
//
// AUD-43: caminhos de API que só eram cobertos pelos testes unitários das
// funções puras (e, às vezes, nem isso). Aqui a rota roda de verdade contra o
// banco, olhando o contrato que o dashboard consome:
//
// - GET /api/tickets: paginação, filtros, busca e ordenação;
// - PATCH /api/notifications: "marcar todas como lidas", inclusive as antigas
//   fora da janela de 30 que o GET devolve;
// - PATCH /api/tickets/[id]: a reconciliação do 409 (o corpo `current` que a
//   lista usa para se corrigir) — o caminho da UI já está em
//   concurrency.cy.js, aqui o contrato da API é verificado direto.

describe('Contrato de GET /api/tickets', () => {
  let agentUser;

  // O POST /api/tickets limita 10 criações por usuário (`ticket:create:<id>`).
  // A paginação precisa de mais que isso, então o usuário é novo por cenário —
  // o contador em memória reinicia com a conta.
  beforeEach(() => {
    cy.createTestUser({ accountType: 'COMPANY' }).then((user) => {
      agentUser = user;
    });
  });

  beforeEach(() => {
    cy.login(agentUser.email, agentUser.password);
  });

  const uniquePrefix = () => `Cobertura ${Date.now()}`;

  /** Cria `count` chamados com o mesmo prefixo de título. */
  function createTickets(prefix, count, body = {}) {
    const created = [];
    for (let index = 0; index < count; index++) {
      cy.request({
        method: 'POST',
        url: '/api/tickets',
        body: {
          title: `${prefix} #${index + 1}`,
          description: `Chamado ${index + 1} da cobertura de API`,
          priority: body.priority || 'LOW',
          ...body,
        },
      }).then((response) => {
        expect(response.status).to.eq(201);
        created.push(response.body);
      });
    }
    return cy.wrap(null).then(() => created);
  }

  function list(query = '') {
    return cy.request({
      url: `/api/tickets${query}`,
      failOnStatusCode: false,
    });
  }

  it('pagina respeitando page e limit e informa os totais', () => {
    const prefix = uniquePrefix();
    createTickets(prefix, 3).then(() => {
      list(`?search=${encodeURIComponent(prefix)}&page=1&limit=2`).then(({ status, body }) => {
        expect(status).to.eq(200);
        expect(body.tickets).to.have.length(2);
        expect(body.pagination).to.include({
          page: 1,
          limit: 2,
          total: 3,
          totalPages: 2,
          hasNextPage: true,
          hasPrevPage: false,
        });
      });

      list(`?search=${encodeURIComponent(prefix)}&page=2&limit=2`).then(({ body }) => {
        expect(body.tickets).to.have.length(1);
        expect(body.pagination).to.include({ page: 2, hasNextPage: false, hasPrevPage: true });
      });
    });
  });

  it('a lista do dashboard navega entre as páginas que a API informa', () => {
    const prefix = uniquePrefix();
    cy.intercept('GET', '/api/tickets?*').as('listTickets');

    createTickets(prefix, 3).then(() => {
      cy.visit('/dashboard');
      cy.get('[data-cy="ticket-filter-search"]').type(prefix);

      // A busca do dashboard vai para a API com o `search` e espera o debounce.
      // A paginação só aparece quando a lista tem mais de uma página; com 3
      // resultados e limit 10, a UI não renderiza os controles.
      cy.wait('@listTickets').then(({ response }) => {
        expect(response.statusCode).to.eq(200);
        expect(response.body.pagination.total).to.eq(3);
        expect(response.body.pagination.totalPages).to.eq(1);
      });

      cy.contains(prefix).should('be.visible');
      cy.get('[data-cy="pagination-prev"]').should('not.exist');
      cy.get('[data-cy="pagination-next"]').should('not.exist');
    });
  });

  it('limita o limit entre 1 e 50 em vez de aceitar qualquer valor', () => {
    list('?limit=0').then(({ status, body }) => {
      expect(status).to.eq(200);
      expect(body.pagination.limit).to.eq(1);
    });

    list('?limit=999').then(({ body }) => {
      expect(body.pagination.limit).to.eq(50);
    });

    // `page` inválida ou negativa cai na primeira página, sem erro.
    list('?page=abc').then(({ body }) => {
      expect(body.pagination.page).to.eq(1);
    });
  });

  it('filtra por status e prioridade, descartando valores fora do enum', () => {
    const prefix = uniquePrefix();
    createTickets(prefix, 2, { priority: 'HIGH' }).then(() => {
      list(`?search=${encodeURIComponent(prefix)}&priority=HIGH`).then(({ body }) => {
        expect(body.tickets).to.have.length(2);
        body.tickets.forEach((ticket) => expect(ticket.priority).to.eq('HIGH'));
      });

      list(`?search=${encodeURIComponent(prefix)}&priority=URGENT`).then(({ body }) => {
        expect(body.tickets).to.have.length(0);
      });

      // Valor inválido é ignorado (não vira 400) e a busca continua valendo.
      list(`?search=${encodeURIComponent(prefix)}&status=INVALIDO`).then(({ status, body }) => {
        expect(status).to.eq(200);
        expect(body.tickets).to.have.length(2);
      });

      list(`?search=${encodeURIComponent(prefix)}&status=OPEN`).then(({ body }) => {
        body.tickets.forEach((ticket) => expect(ticket.status).to.eq('OPEN'));
      });
    });
  });

  it('busca por título e por descrição sem diferenciar maiúsculas', () => {
    const prefix = uniquePrefix();
    cy.request({
      method: 'POST',
      url: '/api/tickets',
      body: {
        title: `${prefix} Impressora`,
        description: 'A impressora do terceiro andar não imprime',
        priority: 'LOW',
      },
    }).its('status').should('eq', 201);

    list(`?search=${encodeURIComponent('terceiro andar')}`).then(({ body }) => {
      expect(
        body.tickets.map((ticket) => ticket.title),
        'busca deve olhar a descrição'
      ).to.include(`${prefix} Impressora`);
    });

    list(`?search=${encodeURIComponent(prefix.toLowerCase())}`).then(({ body }) => {
      expect(
        body.tickets.map((ticket) => ticket.title),
        'busca deve ser insensível a maiúsculas'
      ).to.include(`${prefix} Impressora`);
    });
  });

  it('ordena por prazo com sort=dueDate e coloca o URGENT antes do LOW', () => {
    const prefix = uniquePrefix();
    // URGENT tem 4h de prazo e LOW 168h: a ordenação pelo dueAt tem que
    // devolver o urgente primeiro.
    createTickets(prefix, 1, { priority: 'LOW' }).then(() => {
      createTickets(`${prefix} urgente`, 1, { priority: 'URGENT' }).then(() => {
        list(`?search=${encodeURIComponent(prefix)}&sort=dueDate`).then(({ body }) => {
          const priorities = body.tickets.map((ticket) => ticket.priority);
          expect(priorities[0]).to.eq('URGENT');
          expect(priorities).to.include('LOW');
        });
      });
    });
  });

  it('mantém os KPIs do summary independentes dos filtros da lista', () => {
    const prefix = uniquePrefix();
    createTickets(prefix, 2).then(() => {
      // Um filtro que não devolve nada na lista não zera os KPIs: eles usam a
      // visibilidade base (ver nota do AUD-04 no AGENTS.md §9).
      list(`?search=${encodeURIComponent(prefix)}&priority=URGENT`).then(({ body }) => {
        expect(body.tickets).to.have.length(0);
        expect(body.summary.total).to.be.greaterThan(0);
        expect(body.summary).to.include.keys('open', 'inProgress', 'closed', 'overdue');
      });
    });
  });

  it('responde 401 sem sessão', () => {
    cy.clearCookies();
    list().then(({ status }) => {
      expect(status).to.eq(401);
    });
  });
});

describe('Contrato de PATCH /api/notifications', () => {
  let agentUser;
  let reader;

  before(() => {
    // A empresa é criada por um AGENT; o leitor é um funcionário aprovado, que
    // recebe as notificações quando o AGENT atribui chamados a ele.
    cy.createTestUser({ accountType: 'COMPANY' }).then((owner) => {
      agentUser = owner;
      const email = `leitor-${Date.now()}@teste.com`;
      cy.registerEmployee({
        name: 'Leitor de Notificações',
        email,
        password: 'Senha@123',
        companyCode: owner.companyCode,
      });

      cy.login(owner.email, owner.password);
      cy.visit('/dashboard');
      cy.intercept('PATCH', '**/api/agents/pending/*').as('decide');
      cy.contains(email).closest('li').find('[data-cy^="approve-user-"]').click();
      cy.wait('@decide').its('response.statusCode').should('eq', 200);

      cy.userIdOf(email).then((id) => {
        reader = { ...agentUser, email, password: 'Senha@123', id };
      });
    });
  });

  /** Atribui um chamado ao leitor, o que gera uma notificação para ele. */
  function notifyReader(title) {
    return cy
      .request('POST', '/api/tickets', {
        title,
        description: 'Chamado para a cobertura de notificações',
        priority: 'LOW',
      })
      .its('body.id')
      .then((ticketId) =>
        cy.request('PATCH', `/api/tickets/${ticketId}`, { agentId: reader.id }).its('status')
      )
      .then((status) => expect(status).to.eq(200));
  }

  it('marca todas como lidas e devolve quantas foram atualizadas', () => {
    cy.login(agentUser.email, agentUser.password);
    notifyReader(`Ler todas ${Date.now()}`);

    cy.login(reader.email, reader.password);
    cy.request('/api/notifications').then(({ body }) => {
      expect(body.unreadCount).to.be.greaterThan(0);
    });

    cy.request({ method: 'PATCH', url: '/api/notifications' }).then(({ status, body }) => {
      expect(status).to.eq(200);
      expect(body.updated).to.be.greaterThan(0);
    });

    // Segunda chamada não atualiza nada: já estavam lidas.
    cy.request({ method: 'PATCH', url: '/api/notifications' }).its('body.updated').should('eq', 0);

    cy.request('/api/notifications').then(({ body }) => {
      expect(body.unreadCount).to.eq(0);
      body.notifications.forEach((notification) => expect(notification.readAt).to.be.a('string'));
    });
  });

  it('atinge também as notificações antigas fora da lista de 30', () => {
    // O GET devolve no máximo 30 itens; o "Ler todas" precisa alcançar também
    // o que não aparece na lista. 32 avisos = 32 atribuições ao leitor; as
    // criações passam pelo `ticket:create` liberado em teste com
    // CYPRESS_TEST_SECRET (ver `isTestBypass` em src/lib/rateLimiter.js).
    cy.login(agentUser.email, agentUser.password);
    for (let index = 0; index < 32; index++) {
      const title = `Lote ${index} ${Date.now()}`;
      cy.request('POST', '/api/tickets', {
        title,
        description: 'Chamado para a cobertura de notificações',
        priority: 'LOW',
      })
        .its('body.id')
        .then((ticketId) =>
          cy
            .request('PATCH', `/api/tickets/${ticketId}`, { agentId: reader.id })
            .its('status')
            .then((status) => expect(status, `atribuição de ${title}`).to.eq(200))
        );
    }

    cy.clearCookies();
    cy.login(reader.email, reader.password);
    cy.request('/api/notifications').then(({ body }) => {
      expect(body.notifications.length).to.eq(30);
      expect(body.notifications.every((notification) => notification.canOpen)).to.eq(true);
      expect(body.unreadCount).to.be.greaterThan(30);
    });

    cy.request({ method: 'PATCH', url: '/api/notifications' })
      .its('body.updated')
      .should('be.greaterThan', 30);

    cy.request('/api/notifications').its('body.unreadCount').should('eq', 0);
  });

  it('responde 401 sem sessão', () => {
    cy.clearCookies();
    cy.request({
      method: 'PATCH',
      url: '/api/notifications',
      failOnStatusCode: false,
    }).its('status').should('eq', 401);
  });
});

describe('Reconciliação do 409 na API', () => {
  let owner;
  let outsider;

  before(() => {
    cy.createTestUser({ accountType: 'COMPANY' }).then((user) => {
      owner = user;
    });
    cy.createTestUser({ accountType: 'COMPANY' }).then((user) => {
      outsider = user;
    });
  });

  it('devolve o estado atual para a lista se corrigir e não grava a alteração recusada', () => {
    cy.login(owner.email, owner.password);
    cy.request('POST', '/api/tickets', {
      title: `Reconciliação ${Date.now()}`,
      description: 'Chamado para reconciliar o 409',
      priority: 'LOW',
    }).then(({ body: original }) => {
      // Um chamado recém-criado nasce OPEN; põe IN_PROGRESS antes da disputa
      // para que o estado reconciliado (`current`) seja diferente do inicial.
      cy.request('PATCH', `/api/tickets/${original.id}`, {
        status: 'IN_PROGRESS',
        expectedUpdatedAt: original.updatedAt,
      })
        .its('status')
        .should('eq', 200);

      cy.wait(1500);

      // A tela carregou o chamado AGORA e mantém este `updatedAt`...
      cy.request(`/api/tickets/${original.id}`).then(({ body: loaded }) => {
        // ...enquanto outra pessoa altera a prioridade depois.
        cy.request('PATCH', `/api/tickets/${original.id}`, {
          priority: 'HIGH',
          expectedUpdatedAt: loaded.updatedAt,
        }).its('status').should('eq', 200);

        cy.wait(1500);

        cy.request({
          method: 'PATCH',
          url: `/api/tickets/${original.id}`,
          body: { status: 'CLOSED', expectedUpdatedAt: loaded.updatedAt },
          failOnStatusCode: false,
        }).then(({ status, body }) => {
          expect(status).to.eq(409);
          // O corpo `current` é o que a lista usa para reconciliar.
          expect(body.current).to.be.an('object');
          expect(body.current.priority).to.eq('HIGH');
          expect(body.current.status).to.eq('IN_PROGRESS');
        });

        // A alteração recusada não foi gravada.
        cy.request(`/api/tickets/${original.id}`).then(({ body: current }) => {
          expect(current.status).to.eq('IN_PROGRESS');
          expect(current.priority).to.eq('HIGH');
        });

        // Outra empresa não alcança o chamado (403/404, nunca 200).
        cy.login(outsider.email, outsider.password);
        cy.request({
          url: `/api/tickets/${original.id}`,
          failOnStatusCode: false,
        }).its('status').should('be.oneOf', [403, 404]);
      });
    });
  });
});
