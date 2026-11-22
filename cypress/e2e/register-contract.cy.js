// cypress/e2e/register-contract.cy.js
//
// AUD-40: `POST /api/register` exige o `accountType` explícito. A rota não
// adivinha o fluxo pelo `companyName`/`companyCode`, e um campo de vínculo do
// outro fluxo recebe a mensagem de conflito, não "Unrecognized key".

describe('Contrato de POST /api/register', () => {
    const password = 'Senha@123';

    const uniqueEmail = (prefix) => `${prefix}-${Date.now()}@teste.com`;

    function register(body) {
        return cy.request({
            method: 'POST',
            url: '/api/register',
            body,
            failOnStatusCode: false,
            headers: { 'x-forwarded-for': `127.0.0.${Cypress._.random(1, 254)}` },
        });
    }

    /** AGENT de uma empresa nova (código de convite lido no dashboard). */
    function createCompanyAgent() {
        return cy.createTestUser({ accountType: 'COMPANY' }).then((agent) => {
            cy.login(agent.email, agent.password);
            cy.visit('/dashboard');
            return cy
                .get('[data-cy="company-invite-card"] .font-mono')
                .invoke('text')
                .then((text) => ({ ...agent, companyCode: text.trim() }));
        });
    }

    it('recusa accountType fora de COMPANY/EMPLOYEE com errors.accountType', () => {
        register({
            accountType: 'CLIENT',
            name: 'Conta Inválida',
            email: uniqueEmail('invalido'),
            password,
            confirmPassword: password,
        }).then((res) => {
            expect(res.status).to.eq(400);
            expect(res.body.message).to.eq('Tipo de conta inválido.');
            expect(res.body.errors.accountType[0]).to.match(/COMPANY ou EMPLOYEE/);
        });
    });

    it('explica o conflito quando COMPANY recebe companyCode', () => {
        register({
            accountType: 'COMPANY',
            name: 'Carlos Gestor',
            companyName: 'Empresa Conflito',
            companyCode: 'TECH-4821',
            email: uniqueEmail('conflito-company'),
            password,
            confirmPassword: password,
        }).then((res) => {
            expect(res.status).to.eq(400);
            expect(res.body.message).to.eq('O campo companyCode não combina com accountType: COMPANY.');
        });
    });

    it('explica o conflito quando EMPLOYEE recebe companyName', () => {
        register({
            accountType: 'EMPLOYEE',
            name: 'Ana Silva',
            companyName: 'Empresa Conflito',
            companyCode: 'TECH-4821',
            email: uniqueEmail('conflito-employee'),
            password,
            confirmPassword: password,
        }).then((res) => {
            expect(res.status).to.eq(400);
            expect(res.body.message).to.eq('O campo companyName não combina com accountType: EMPLOYEE.');
        });
    });

    it('mantém o Fluxo 3 quando o corpo não traz accountType', () => {
        register({
            name: 'Conta Sem Empresa',
            email: uniqueEmail('fluxo3'),
            password,
            confirmPassword: password,
        }).then((res) => {
            expect(res.status).to.eq(201);
            expect(res.body.email).to.include('fluxo3-');
        });
    });

    it('recusa companyCode no Fluxo 3 em vez de criar conta sem empresa', () => {
        register({
            name: 'Conta Sem Empresa',
            companyCode: 'TECH-4821',
            email: uniqueEmail('fluxo3-code'),
            password,
            confirmPassword: password,
        }).then((res) => {
            expect(res.status).to.eq(400);
            expect(res.body.errors.companyCode[0]).to.match(/accountType: EMPLOYEE/);
        });
    });

    it('cria o funcionário PENDING quando accountType: EMPLOYEE é explícito', () => {
        createCompanyAgent().then(({ companyCode }) => {
            expect(companyCode, 'código da empresa').to.be.a('string').and.not.be.empty;

            register({
                accountType: 'EMPLOYEE',
                name: 'Funcionário Explícito',
                companyCode,
                email: uniqueEmail('funcionario'),
                password,
                confirmPassword: password,
            }).then((res) => {
                expect(res.status).to.eq(201);
                expect(res.body.approvalStatus).to.eq('PENDING');
            });
        });
    });
});
