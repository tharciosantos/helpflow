// cypress/e2e/approvals.cy.js
//
// AUD-37: conta criada por código de empresa nasce PENDING. Conhecer o código
// não basta para entrar no tenant — um AGENT da mesma empresa aprova ou recusa.

describe('Aprovação de contas por código de empresa', () => {
    const password = 'Senha@123';

    // O código tem exatamente o formato `<préfixo>-<4 dígitos>` num elemento
    // `font-mono`; varrer o texto inteiro do card pega pedaços do nome da
    // empresa (que também é gerada com timestamp).
    function companyCodeOf() {
        return cy.get('[data-cy="company-invite-card"] .font-mono')
            .invoke('text')
            .then((text) => text.trim() || null);
    }

    /** Loga o AGENT logo após o cadastro via API (empresa nova, sem pendentes). */
    function loginAndOpenDashboard(agent) {
        cy.login(agent.email, agent.password);
        cy.visit('/dashboard');
        cy.get('[data-cy="company-invite-card"]').should('be.visible');
    }

    it('mantém o cadastro pendente, bloqueia o login e libera após aprovação', () => {
        const email = `pendente-${Date.now()}@teste.com`;

        cy.createTestUser({ accountType: 'COMPANY' }).then((agent) => {
            loginAndOpenDashboard(agent);
            companyCodeOf().then((companyCode) => {
                expect(companyCode, 'código da empresa').to.be.a('string');
                cy.clearCookies();

                // Cadastro real pela tela com o link de convite.
                cy.visit(`/register?companyCode=${companyCode}`);
                cy.get('[data-cy="register-form-ready"]').should('be.visible');
                cy.get('[data-cy="register-name"]').type('Funcionário Pendente');
                cy.get('[data-cy="register-email"]').type(email);
                cy.get('[data-cy="register-password"]').type(password);
                cy.get('[data-cy="register-confirm-password"]').type(password);
                cy.get('[data-cy="register-submit"]').click();
                cy.get('[data-cy="register-pending-approval"]').should('be.visible');
                cy.url().should('not.include', '/dashboard');

                // Conta pendente não autentica.
                cy.visit('/login');
                cy.get("[data-cy='login-email']").type(email);
                cy.get("[data-cy='login-password']").type(password);
                cy.get("[data-cy='login-submit']").click();
                cy.contains('aguarda aprovação').should('be.visible');
                cy.url().should('include', '/login');

                // AGENT vê a conta pendente e aprova.
                cy.visit('/login');
                loginAndOpenDashboard(agent);
                cy.get('[data-cy="pending-approvals-card"]').should('be.visible');
                cy.contains(email).should('be.visible');
                cy.intercept('PATCH', '**/api/agents/pending/*').as('decide');
                cy.contains(email).closest('li').find('[data-cy^="approve-user-"]').click();
                cy.wait('@decide').its('response.statusCode').should('eq', 200);
                cy.contains(email).should('not.exist');

                // Conta aprovada entra.
                cy.clearCookies();
                cy.visit('/login');
                cy.get("[data-cy='login-email']").type(email);
                cy.get("[data-cy='login-password']").type(password);
                cy.get("[data-cy='login-submit']").click();
                cy.url({ timeout: 15000 }).should('include', '/dashboard');
            });
        });
    });

    it('recusa mantendo a conta fora do tenant', () => {
        const email = `recusado-${Date.now()}@teste.com`;

        cy.createTestUser({ accountType: 'COMPANY' }).then((agent) => {
            loginAndOpenDashboard(agent);
            companyCodeOf().then((companyCode) => {
                cy.registerEmployee({ name: 'Funcionário Recusado', email, password, companyCode });
                cy.reload();

                cy.contains(email).should('be.visible');
                cy.contains(email).closest('li').find('[data-cy^="reject-user-"]').click();
                cy.contains(email).should('not.exist');

                cy.clearCookies();
                cy.visit('/login');
                cy.get("[data-cy='login-email']").type(email);
                cy.get("[data-cy='login-password']").type(password);
                cy.get("[data-cy='login-submit']").click();
                cy.contains('foi recusada').should('be.visible');
                cy.url().should('include', '/login');
            });
        });
    });

    it('não expõe a conta pendente para AGENT de outra empresa', () => {
        const email = `tenant-${Date.now()}@teste.com`;

        cy.createTestUser({ accountType: 'COMPANY' }).then((owner) => {
            loginAndOpenDashboard(owner);
            companyCodeOf().then((companyCode) => {
                cy.registerEmployee({ name: 'Funcionário Alheio', email, password, companyCode }).then((created) => {
                    cy.createTestUser({ accountType: 'COMPANY' }).then((outsider) => {
                        // cy.session restaura a sessão sem `visit`: o cookie do
                        // AGENT dono sai e o do outsider entra antes do request.
                        cy.login(outsider.email, outsider.password);
                        cy.request('GET', '/api/agents/pending').then(({ status, body }) => {
                            expect(status).to.eq(200);
                            expect(body.map((user) => user.email)).to.not.include(created.email);
                        });
                    });
                });
            });
        });
    });
});
