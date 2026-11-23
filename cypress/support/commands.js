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

  // AUD-40: o tipo de conta vai explícito no corpo. `accountType: "COMPANY"`
  // cria empresa + AGENT; o payload sem `accountType` cai no Fluxo 3 (conta sem
  // empresa, CLIENT em produção), que é a compatibilidade com as specs.
  const isCompany = user.accountType === "COMPANY" || user.role === "AGENT";
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
    .then((res) => {
      // O AGENT da empresa também transporta o companyCode: specs que precisam
      // cadastrar um funcionário na própria empresa usam o código do próprio
      // `agent` (sem reler o card do dashboard).
      expect(res.status, "cadastro de usuário de teste").to.eq(201);
      return { ...user, id: res.body.id, companyCode: res.body.companyCode || null };
    });
});

// Cadastra um funcionário pelo código da empresa (fluxo real, nasce PENDING).
// IP único como no `createTestUser`: sem o header a rota cai em `unknown` e
// todas as specs dividem a mesma cota de `register:<ip>` (5 por 15 min).
Cypress.Commands.add("registerEmployee", ({ name, email, password, companyCode }) => {
  const testIp = `127.0.0.${Cypress._.random(1, 254)}`;
  return cy.request({
    method: "POST",
    url: "/api/register",
    headers: { "x-forwarded-for": testIp },
    body: {
      accountType: "EMPLOYEE",
      name,
      email,
      password,
      confirmPassword: password,
      companyCode,
    },
  }).then((res) => {
    expect(res.status, "cadastro de funcionário").to.eq(201);
    expect(res.body.approvalStatus, "conta nasce pendente").to.eq("PENDING");
    return { name, email, password };
  });
});

// Id do usuário por e-mail, para montar payloads de API nos specs que
// precisam de um membro que não seja o próprio criador do chamado. Usa a
// sessão restaurada pelo cy.login, então chame-o logo após o login.
Cypress.Commands.add("userIdOf", (email) =>
  cy.request("/api/agents").then(({ status, body }) => {
    expect(status, `listagem de membros para ${email}`).to.eq(200);
    const user = (body || []).find((u) => u.email === email);
    expect(user, `membro ${email} em /api/agents`).to.not.be.undefined;
    return user.id;
  })
);

Cypress.Commands.add("login", (email, password) => {
  cy.session(
    // A origem entra na chave: os specs rodam contra o próprio app e um
    // `cy.visit` de outro teste é o que faz o cache restaurar a sessão
    // (sem origem, o Cypress aborta por "session id already in use").
    [email, password, Cypress.config('baseUrl')],
    () => {
      cy.visit("/login");
      // Espera o React montar antes de digitar: sem hidratação o submit cai no
      // form nativo e a página recarrega, perdendo os valores digitados.
      cy.get("[data-cy='login-submit']").should("not.be.disabled");
      cy.get("[data-cy='login-email']").type(email);
      cy.get("[data-cy='login-password']").type(password);
      cy.get("[data-cy='login-submit']").click();
      cy.url({ timeout: 15000 }).should("include", "/dashboard");
    }
  );
});
