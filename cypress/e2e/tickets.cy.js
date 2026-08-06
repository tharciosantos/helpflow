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

            cy.contains("Ticket criado com sucesso").should("be.visible");
            cy.contains(title).should("be.visible");
        });
    });

    describe("Listagem", () => {
        it("deve exibir a estrutura principal do dashboard", () => {
            cy.visit("/dashboard");

            cy.contains("HelpFlow").should("be.visible");
            cy.contains("Dashboard").should("be.visible");
            cy.contains("Novo Ticket").should("be.visible");
            cy.contains("Meus tickets").should("be.visible");
        });
    });

    describe("Atualização", () => {
        it("deve atualizar o status de um ticket específico", () => {
            const title = `Ticket ${Date.now()}`;

            cy.createTestUser({ role: 'AGENT' }).then((agent) => {
                cy.login(agent.email, agent.password);
            });

            cy.visit("/dashboard/tickets/new");

            cy.get('[data-cy="ticket-create-title"]').type(title);
            cy.get('[data-cy="ticket-create-description"]').type("Teste status");
            cy.get('[data-cy="ticket-create-submit"]').click();

            cy.contains("Ticket criado com sucesso").should("be.visible");

            cy.intercept("PATCH", "/api/tickets/*").as("updateTicketStatus");

            cy.contains(title)
                .closest('[data-cy="ticket-card"]')
                .within(() => {
                    cy.get('[data-cy$="-status"]').select("IN_PROGRESS");
                });

            cy.wait("@updateTicketStatus")
                .its("response.statusCode")
                .should("eq", 200);

            cy.contains(title)
                .closest('[data-cy="ticket-card"]')
                .find('[data-cy="ticket-status-badge"]')
                .should("contain.text", "Em Progresso");
        });
    });

    describe("Exclusão", () => {
        it("deve excluir um ticket específico", () => {
            const title = `Ticket para excluir ${Date.now()}`;

            cy.visit("/dashboard/tickets/new");

            cy.get('[data-cy="ticket-create-title"]').type(title);
            cy.get('[data-cy="ticket-create-description"]').type("Teste exclusão");
            cy.get('[data-cy="ticket-create-submit"]').click();

            cy.contains("Ticket criado com sucesso").should("be.visible");
            cy.contains(title).should("be.visible");

            cy.on("window:confirm", () => true);

            cy.contains(title)
                .closest('[data-cy="ticket-card"]')
                .within(() => {
                    cy.get('[data-cy$="-delete"]').click();
                });

            cy.contains(title).should("not.exist");
        });
    });
});
