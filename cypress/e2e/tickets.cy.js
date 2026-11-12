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

            cy.get('[data-cy="ticket-create-title"]').type(title);
            cy.get('[data-cy="ticket-create-description"]').type("Descrição teste");
            cy.get('[data-cy="ticket-create-submit"]').click();

            cy.contains("Chamado criado com sucesso").should("be.visible");
            cy.contains(title).scrollIntoView().should("be.visible");
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
                cy.get('[data-cy="ticket-create-title"]').type(title);
                cy.get('[data-cy="ticket-create-description"]').type("Teste status");
                cy.get('[data-cy="ticket-create-submit"]').click();

                cy.contains("Chamado criado com sucesso").should("be.visible");

                // A troca de status acontece no detalhe do chamado (AGENT).
                cy.contains(title).scrollIntoView().click();
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

            cy.get('[data-cy="ticket-create-title"]').type(title);
            cy.get('[data-cy="ticket-create-description"]').type("Teste exclusão");
            cy.get('[data-cy="ticket-create-submit"]').click();

            cy.contains("Chamado criado com sucesso").should("be.visible");
            cy.contains(title).scrollIntoView().should("be.visible");

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
