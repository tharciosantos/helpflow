const { defineConfig } = require("cypress");
require("dotenv").config(); // carrega .env para que CYPRESS_TEST_SECRET esteja disponível

if (!process.env.CYPRESS_TEST_SECRET) {
    console.warn(
        "\n[Cypress] Aviso: CYPRESS_TEST_SECRET não está definido.\n" +
        "Os testes de permissão que criam usuários AGENT vão falhar.\n" +
        "Configure a variável no arquivo .env antes de rodar os testes.\n"
    );
}

module.exports = defineConfig({
    e2e: {
        baseUrl: "http://localhost:3000",
        supportFile: "cypress/support/e2e.js",
        setupNodeEvents(on) {
            // Fecha um chamado fora da API: o CLIENT não altera status
            // (getForbiddenTicketFields), mas a tela precisa do estado CLOSED.
            on("task", {
                async closeTicket(id) {
                    const { PrismaClient } = require("@prisma/client");
                    const prisma = new PrismaClient();
                    try {
                        await prisma.ticket.update({
                            where: { id },
                            data: { status: "CLOSED", resolvedAt: new Date() },
                        });
                        return null;
                    } finally {
                        await prisma.$disconnect();
                    }
                },
            });
        },
    },
    // Cypress.env() é usado em commands.js para passar o testSecret como header de API.
    // allowCypressEnv: true é necessário no Cypress 15+ para usar Cypress.env() no browser.
    allowCypressEnv: true,
    env: {
        testSecret: process.env.CYPRESS_TEST_SECRET,
    },
});
