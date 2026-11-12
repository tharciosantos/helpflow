describe("Tickets", () => {
    beforeEach(() => {
        cy.createTestUser().then((user) => {
            cy.login(user.email, user.password);
        });
    });

    describe("Criação", () => {
        it("deve criar um ticket", () => {
            const title = `Ticket ${Date.now()}`;

            cy.visit("/dashboard/tickets/new");

            // Espera o React montar: sem hidratação o submit cai no form nativo.
            cy.get('[data-cy="ticket-create-submit"]').should("not.be.disabled");

            cy.intercept("POST", "/api/tickets").as("createTicket");

            cy.get('[data-cy="ticket-create-title"]').type(title);
            cy.get('[data-cy="ticket-create-description"]').type("Descrição teste");
            cy.get('[data-cy="ticket-create-submit"]').click();

            cy.wait("@createTicket").its("response.statusCode").should("eq", 201);

            // O formulário redireciona para o dashboard logo após criar, então
            // a mensagem de sucesso é efêmera: o resultado estável é o ticket
            // aparecendo na listagem.
            cy.url({ timeout: 15000 }).should("include", "/dashboard");
            cy.contains(title, { timeout: 15000 }).scrollIntoView().should("be.visible");
        });
    });

    describe("Listagem", () => {
        it("deve exibir a estrutura principal do dashboard", () => {
            cy.visit("/dashboard");

            cy.contains("HelpFlow").should("be.visible");
            cy.contains("Dashboard").should("be.visible");
            cy.contains("Novo Chamado").should("be.visible");
            // O resumo fica abaixo da dobra no viewport padrão do Cypress.
            cy.contains("Resumo Geral").scrollIntoView().should("be.visible");
        });
    });

    describe("Atualização", () => {
        it("deve atualizar o status de um ticket específico", () => {
            const title = `Ticket ${Date.now()}`;

            // O AGENT precisa ser o mesmo em todo o fluxo: o chamado é criado e
            // editado dentro da sua empresa, senão o detalhe retorna 404.
            cy.clearCookies();
            cy.createTestUser({ role: 'AGENT' }).then((agent) => {
                cy.login(agent.email, agent.password);

                cy.visit("/dashboard/tickets/new");
                cy.get('[data-cy="ticket-create-submit"]').should("not.be.disabled");
                cy.get('[data-cy="ticket-create-title"]').type(title);
                cy.get('[data-cy="ticket-create-description"]').type("Teste status");
                cy.get('[data-cy="ticket-create-submit"]').click();

                // O formulário redireciona para o dashboard após criar.
                cy.url({ timeout: 15000 }).should("include", "/dashboard");

                // A troca de status acontece no detalhe do chamado (AGENT).
                cy.contains(title, { timeout: 15000 }).scrollIntoView().click();
                cy.url().should("include", "/ticket/");

                cy.intercept("PATCH", "/api/tickets/*").as("updateTicketStatus");

                cy.get('[data-cy="ticket-detail-status"]').select("IN_PROGRESS");
                cy.get('[data-cy="ticket-detail-status-submit"]').click();

                cy.wait("@updateTicketStatus")
                    .its("response.statusCode")
                    .should("eq", 200);

                cy.get('[data-cy="ticket-detail-status"]').should("have.value", "IN_PROGRESS");
            });
        });
    });

    describe("Exclusão", () => {
        it("deve excluir um ticket específico", () => {
            const title = `Ticket para excluir ${Date.now()}`;

            cy.visit("/dashboard/tickets/new");

            cy.get('[data-cy="ticket-create-submit"]').should("not.be.disabled");
            cy.get('[data-cy="ticket-create-title"]').type(title);
            cy.get('[data-cy="ticket-create-description"]').type("Teste exclusão");
            cy.get('[data-cy="ticket-create-submit"]').click();

            // O formulário redireciona para o dashboard após criar.
            cy.url({ timeout: 15000 }).should("include", "/dashboard");
            cy.contains(title, { timeout: 15000 }).scrollIntoView().should("be.visible");

            // A exclusão fica no detalhe do chamado, confirmada por modal.
            cy.contains(title).scrollIntoView().click();
            cy.url().should("include", "/ticket/");

            cy.intercept("DELETE", "/api/tickets/*").as("deleteTicket");

            cy.get('[data-cy="ticket-detail-delete"]').click();
            cy.contains("button", "Excluir").click();

            cy.wait("@deleteTicket").then((interception) => {
                // A rota responde 204 No Content em uma exclusão bem-sucedida.
                expect(interception.response.statusCode).to.be.oneOf([200, 204]);
            });
        });
    });
});
