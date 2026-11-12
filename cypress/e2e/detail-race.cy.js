// cypress/e2e/detail-race.cy.js
//
// Reproduz a corrida ao trocar de chamado em /ticket/[id].
//
// O detalhe é alcançado por <Link> na lista (navegação client-side), então o
// componente NÃO remonta ao trocar de chamado: um único React mantém o estado e
// a resposta do ticket anterior pode chegar depois e repintar a tela.
//
// Por isso a navegação aqui é por clique no link da lista, nunca cy.visit entre
// dois chamados — cy.visit remonta tudo e esconde o bug.

describe('Troca de chamado no detalhe', () => {
  let agentUser;
  let ticketA;
  let ticketB;

  before(() => {
    cy.createTestUser({ role: 'AGENT' }).then((user) => {
      agentUser = user;
    });
  });

  beforeEach(() => {
    cy.login(agentUser.email, agentUser.password);

    const stamp = Date.now();
    // B é criado depois, então aparece primeiro na ordenação "mais recentes".
    cy.request({
      method: 'POST',
      url: '/api/tickets',
      body: { title: `Chamado A ${stamp}`, description: 'Antigo da corrida', priority: 'LOW' },
    }).then((response) => {
      ticketA = response.body;
    });

    cy.request({
      method: 'POST',
      url: '/api/tickets',
      body: { title: `Chamado B ${stamp}`, description: 'Novo da corrida', priority: 'HIGH' },
    }).then((response) => {
      ticketB = response.body;
    });
  });

  it('mostra os dados do chamado novo, não os do anterior', () => {
    // A resposta do chamado A é atrasada; a do B volta na hora.
    cy.intercept('GET', `/api/tickets/${ticketA.id}`, (req) => {
      req.continue((res) => {
        res.setDelay(1500);
      });
    }).as('getA');

    cy.visit('/dashboard');

    // Entra em A (resposta lenta) e, antes dela chegar, clica em B.
    cy.contains(ticketA.title).scrollIntoView().click();
    cy.url().should('include', `/ticket/${ticketA.id}`);

    cy.intercept('GET', `/api/tickets/${ticketB.id}`).as('getB');

    cy.visit('/dashboard');
    cy.contains(ticketB.title).scrollIntoView().click();
    cy.url().should('include', `/ticket/${ticketB.id}`);

    cy.wait('@getB');
    // Depois que a resposta atrasada de A chegaria, a tela deve seguir no B.
    cy.wait(2000);
    cy.contains(ticketB.title).should('be.visible');
    cy.contains(ticketA.title).should('not.exist');
  });

  it('reaproveita a mesma instância ao trocar de chamado', () => {
    cy.intercept('GET', `/api/tickets/${ticketA.id}`).as('getA');
    cy.intercept('GET', `/api/tickets/${ticketB.id}`).as('getB');

    cy.visit('/dashboard');

    cy.contains(ticketA.title).scrollIntoView().click();
    cy.wait('@getA');
    cy.contains(ticketA.title).should('be.visible');

    // Volta pela navegação SPA e abre o B: mesma árvore React.
    cy.get('[data-cy="ticket-detail-back-link"]').click();
    cy.contains(ticketB.title).scrollIntoView().click();

    cy.wait('@getB');
    cy.contains(ticketB.title).should('be.visible');
    cy.contains(ticketA.title).should('not.exist');
  });
});
