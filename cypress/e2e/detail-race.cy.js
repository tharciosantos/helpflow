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
    //
    // O atraso é gravado no REQUEST (opção `delay`), não na resposta via
    // `res.setDelay`: atrasar o `Response` do Cypress e navegar para outra
    // página antes dele sair derruba a conexão do proxy do browser
    // ("connection to the browser closed..."), mesmo com a página recarregada —
    // e é exatamente esse o cenário do teste.
    cy.intercept('GET', `/api/tickets/${ticketA.id}`, { delay: 1500 }).as('getA');

    cy.intercept('GET', `/api/tickets/${ticketB.id}`).as('getB');

    cy.visit('/dashboard');

    // Entra em A: o detalhe fica carregando enquanto a resposta atrasada não chega.
    cy.contains(ticketA.title).scrollIntoView().click();
    cy.url().should('include', `/ticket/${ticketA.id}`);

    // Enquanto A ainda carrega (sem a barra lateral do detalhe), o link do B
    // não existe na tela. O caminho é o próprio app: voltar pela URL do
    // dashboard e abrir B. Como é a mesma aba, o React da troca é o mesmo
    // depois do cliente montar a rota do B.
    cy.go('back');
    cy.url().should('include', '/dashboard');
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
