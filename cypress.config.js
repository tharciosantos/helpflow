const { defineConfig } = require("cypress");

module.exports = defineConfig({
    e2e: {
        baseUrl: "http://localhost:3000",
        supportFile: "cypress/support/e2e.js",
    },
    env: {
        // Deve ser igual ao CYPRESS_TEST_SECRET no .env
        testSecret: "cypress-helpflow-secret-2024",
    },
});
