describe("Autenticação", () => {
    it("deve criar uma nova conta", () => {
        const email = `usuario-${Date.now()}@teste.com`;

        cy.visit("/register");

        cy.get("[data-cy='register-name']").type("Usuário Teste");
        cy.get("[data-cy='register-email']").type(email);
        cy.get("[data-cy='register-password']").type("Senha@123");
        cy.get("[data-cy='register-confirm-password']").type("Senha@123");
        cy.get("[data-cy='register-submit']").click();

        cy.url().should("include", "/dashboard");
        cy.contains("Olá").should("be.visible");
    });

    it("deve fazer login com credenciais válidas", () => {
        cy.createTestUser().then((user) => {
            cy.visit("/login");

            cy.get("[data-cy='login-email']").type(user.email);
            cy.get("[data-cy='login-password']").type(user.password);
            cy.get("[data-cy='login-submit']").click();

            cy.url().should("include", "/dashboard");
            cy.contains("Organize e acompanhe").should("be.visible");
        });
    });

    it("deve mostrar erro com senha inválida", () => {
        cy.createTestUser().then((user) => {
            cy.visit("/login");

            cy.get("[data-cy='login-email']").type(user.email);
            cy.get("[data-cy='login-password']").type("senha-errada");
            cy.get("[data-cy='login-submit']").click();

            cy.url().should("include", "/login");
            cy.contains("Email ou senha inválidos").should("be.visible");
        });
    });

    it("deve proteger o dashboard de usuários não autenticados", () => {
        cy.visit("/dashboard");

        cy.url().should("not.include", "/dashboard");
    });
});
