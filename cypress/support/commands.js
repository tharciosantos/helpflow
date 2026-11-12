Cypress.Commands.add("createTestUser", (overrides = {}) => {
  const uniqueId = `${Date.now()}-${Cypress._.random(1000, 9999)}`;
  const user = {
    name: "Usuário Teste",
    email: `usuario-${uniqueId}@teste.com`,
    password: "Senha@123",
    role: "CLIENT",
    ...overrides,
  };

  // IP único por criação para não estourar o rate limiter (register:${ip})
  const testIp = `127.0.0.${Cypress._.random(1, 254)}`;

  // O registerSchema com accountType/companyName não aceita o campo `role`:
  // nesse fluxo o papel vem do accountType. O `role` só é aceito no fallback.
  const isCompany = user.role === "AGENT";
  const body = {
    name: user.name,
    email: user.email,
    password: user.password,
    confirmPassword: user.password,
    ...(isCompany
      ? { accountType: "COMPANY", companyName: user.companyName || `Empresa Teste ${uniqueId}` }
      : { role: user.role }),
  };

  return cy
    .request({
      method: "POST",
      url: "/api/register",
      body,
      headers: {
        "x-test-secret": Cypress.env("testSecret") || "",
        "x-forwarded-for": testIp,
      },
    })
    .then(() => user);
});

Cypress.Commands.add("login", (email, password) => {
  cy.visit("/login");
  // Espera o React montar antes de digitar: sem hidratação o submit cai no
  // form nativo e a página recarrega, perdendo os valores digitados.
  cy.get("[data-cy='login-submit']").should("not.be.disabled");
  cy.get("[data-cy='login-email']").type(email);
  cy.get("[data-cy='login-password']").type(password);
  cy.get("[data-cy='login-submit']").click();
  cy.url({ timeout: 15000 }).should("include", "/dashboard");
});
