describe("Comentários do chamado", () => {
    beforeEach(() => {
        cy.createTestUser().then((user) => {
            cy.login(user.email, user.password);
        });
    });

    function createTicketAndOpen(title) {
        cy.intercept("POST", "/api/tickets").as("createTicket");
        cy.visit("/dashboard/tickets/new");

        cy.get('[data-cy="ticket-create-title"]').type(title);
        cy.get('[data-cy="ticket-create-description"]').type("Descrição para teste de comentários");
        cy.get('[data-cy="ticket-create-submit"]').click();

        cy.wait("@createTicket").then((interception) => {
            const id = interception.response.body?.id;
            expect(id, "ticket id da API").to.exist;
            cy.visit(`/ticket/${id}`);
        });
    }

    it("deve enviar um comentário e persistir após recarregar", () => {
        const title = `Ticket comentários ${Date.now()}`;
        const message = `Mensagem de teste ${Date.now()}`;

        createTicketAndOpen(title);

        // A seção fica abaixo da dobra; o scroll garante que o elemento entre na
        // viewport antes da asserção de visibilidade.
        cy.contains("Mensagens e Histórico de Atendimento").scrollIntoView().should("be.visible");

        cy.intercept("POST", "/api/tickets/*/comments").as("createComment");

        cy.get('[data-cy="ticket-comment-input"]').type(message);
        cy.get('[data-cy="ticket-comment-submit"]').click();

        cy.wait("@createComment").its("response.statusCode").should("eq", 201);
        cy.contains(message).scrollIntoView().should("be.visible");

        cy.reload();
        cy.contains(message).scrollIntoView().should("be.visible");
    });

    it("deve bloquear envio de comentário vazio", () => {
        const title = `Ticket vazio ${Date.now()}`;

        createTicketAndOpen(title);

        cy.get('[data-cy="ticket-comment-submit"]').should("be.disabled");
        cy.get('[data-cy="ticket-comment-input"]').should("have.value", "");
    });

    it("deve excluir o próprio comentário", () => {
        const title = `Ticket excluir msg ${Date.now()}`;
        const message = `Excluir esta ${Date.now()}`;

        createTicketAndOpen(title);

        cy.intercept("POST", "/api/tickets/*/comments").as("createComment");
        cy.get('[data-cy="ticket-comment-input"]').type(message);
        cy.get('[data-cy="ticket-comment-submit"]').click();
        cy.wait("@createComment").its("response.statusCode").should("eq", 201);
        cy.contains(message).scrollIntoView().should("be.visible");

        cy.intercept("DELETE", "/api/tickets/*/comments/*").as("deleteComment");

        cy.contains(message)
            .closest('[data-cy="ticket-comment-item"]')
            .within(() => {
                cy.get('[data-cy="ticket-comment-delete"]').click();
            });

        // A exclusão é confirmada num modal (ConfirmDialog), não em window.confirm.
        cy.contains("button", "Excluir").click();

        cy.wait("@deleteComment").its("response.statusCode").should("eq", 200);
        cy.contains(message).should("not.exist");
    });

    it("API deve exigir autenticação para comentar", () => {
        cy.clearCookies();
        cy.request({
            method: "POST",
            url: "/api/tickets/inexistente/comments",
            body: { content: "sem auth" },
            failOnStatusCode: false,
        }).then((res) => {
            expect(res.status).to.eq(401);
        });
    });
});
