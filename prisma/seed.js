// ---------------------------------------------------------------------------
// Seed de demonstração do HelpFlow.
//
// Cria a empresa DEMO-2026, as duas contas anunciadas na tela de login e um
// conjunto pequeno de chamados para o dashboard não nascer vazio.
//
// É idempotente: rodar mais de uma vez não duplica nada. A empresa e os
// usuários usam upsert pela chave natural (`Company.code` / `User.email`) e os
// chamados usam ids fixos. Contas já existentes mantêm a senha atual — o seed
// só define `Demo@123456` na criação.
//
// O prazo (dueAt) dos chamados usa `computeDueAt` de `src/lib/sla.js`, para que
// o demo siga exatamente a mesma regra de SLA da aplicação.
//
// Uso: npm run db:seed  (ou node prisma/seed.js)
// ---------------------------------------------------------------------------

require('dotenv').config({ quiet: true });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const DEMO_COMPANY = {
  code: 'DEMO-2026',
  name: 'HelpFlow Corporativo (Demo)',
};

// Credenciais exibidas em /login e no README.
const DEMO_PASSWORD = 'Demo@123456';

const DEMO_USERS = [
  { email: 'agent.demo@helpflow.com', name: 'Ana Ribeiro', role: 'AGENT' },
  { email: 'client.demo@helpflow.com', name: 'Bruno Carvalho', role: 'CLIENT' },
];

const HOUR_MS = 60 * 60 * 1000;
const NOW = Date.now();
const hoursAgo = (hours) => new Date(NOW - hours * HOUR_MS);

async function main() {
  // Import dinâmico: `src/lib` é ESM e este arquivo é CommonJS.
  const { computeDueAt } = await import('../src/lib/sla.js');
  const { buildNotificationMessage } = await import('../src/lib/notifications.js');

  const company = await prisma.company.upsert({
    where: { code: DEMO_COMPANY.code },
    update: { name: DEMO_COMPANY.name },
    create: { ...DEMO_COMPANY },
  });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const userByRole = {};

  for (const demoUser of DEMO_USERS) {
    userByRole[demoUser.role] = await prisma.user.upsert({
      where: { email: demoUser.email },
      update: {
        name: demoUser.name,
        role: demoUser.role,
        companyId: company.id,
      },
      create: {
        name: demoUser.name,
        email: demoUser.email,
        password_hash: passwordHash,
        role: demoUser.role,
        auth_provider: 'credentials',
        companyId: company.id,
      },
    });
  }

  const agent = userByRole.AGENT;
  const client = userByRole.CLIENT;

  const tickets = [
    {
      id: 'demo-ticket-vpn',
      title: 'Solicitação de acesso à VPN',
      description:
        'Preciso de acesso à VPN para trabalhar remotamente nas sextas-feiras. O notebook corporativo já está configurado.',
      status: 'OPEN',
      priority: 'MEDIUM',
      createdAt: hoursAgo(6),
      authorId: client.id,
      agentId: null,
    },
    {
      id: 'demo-ticket-wifi',
      title: 'Notebook não conecta ao Wi-Fi do escritório',
      description:
        'Desde ontem o notebook não enxerga a rede corporativa. Cabo funciona normalmente e os demais dispositivos conectam sem problema.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      createdAt: hoursAgo(10),
      authorId: client.id,
      agentId: agent.id,
      firstResponseAt: hoursAgo(9),
    },
    {
      id: 'demo-ticket-atrasado',
      title: 'Erro ao emitir nota fiscal no sistema interno',
      description:
        'O sistema retorna erro ao gerar a nota fiscal do pedido 4821. O fechamento do mês está parado por causa disso.',
      status: 'OPEN',
      priority: 'URGENT',
      createdAt: hoursAgo(9),
      authorId: client.id,
      agentId: null,
    },
    {
      id: 'demo-ticket-office',
      title: 'Instalação do pacote Office',
      description:
        'Solicito a instalação do pacote Office no notebook novo entregue pela TI na semana passada.',
      status: 'CLOSED',
      priority: 'LOW',
      createdAt: hoursAgo(120),
      authorId: client.id,
      agentId: agent.id,
      firstResponseAt: hoursAgo(119),
      resolvedAt: hoursAgo(115),
    },
  ];

  for (const ticket of tickets) {
    const { firstResponseAt, resolvedAt, ...fields } = ticket;
    await prisma.ticket.upsert({
      where: { id: ticket.id },
      update: {},
      create: {
        ...fields,
        companyId: company.id,
        dueAt: computeDueAt(ticket.priority, ticket.createdAt),
        firstResponseAt,
        resolvedAt,
      },
    });
  }

  const comments = [
    {
      id: 'demo-comment-wifi-public',
      ticketId: 'demo-ticket-wifi',
      authorId: agent.id,
      visibility: 'PUBLIC',
      content:
        'Bom dia, Bruno! Já estou verificando o driver de rede da máquina. Pode testar o cabo e me confirmar se a conexão segue estável?',
      createdAt: hoursAgo(9),
    },
    {
      id: 'demo-comment-wifi-internal',
      ticketId: 'demo-ticket-wifi',
      authorId: agent.id,
      visibility: 'INTERNAL',
      content:
        'Outros dispositivos conectam na mesma rede. Suspeita de placa de rede ou driver desatualizado — verificar antes de trocar o equipamento.',
      createdAt: hoursAgo(8),
    },
    {
      id: 'demo-comment-office-public',
      ticketId: 'demo-ticket-office',
      authorId: agent.id,
      visibility: 'PUBLIC',
      content: 'Instalação concluída e validada com o usuário. Qualquer problema, é só abrir um novo chamado.',
      createdAt: hoursAgo(116),
    },
  ];

  for (const comment of comments) {
    await prisma.ticketComment.upsert({
      where: { id: comment.id },
      update: {},
      create: comment,
    });
  }

  const histories = [
    {
      id: 'demo-history-wifi-agent',
      ticketId: 'demo-ticket-wifi',
      actorId: agent.id,
      field: 'agentId',
      from: null,
      to: agent.id,
      createdAt: hoursAgo(9),
    },
    {
      id: 'demo-history-wifi-status',
      ticketId: 'demo-ticket-wifi',
      actorId: agent.id,
      field: 'status',
      from: 'OPEN',
      to: 'IN_PROGRESS',
      createdAt: hoursAgo(9),
    },
    {
      id: 'demo-history-office-status',
      ticketId: 'demo-ticket-office',
      actorId: agent.id,
      field: 'status',
      from: 'IN_PROGRESS',
      to: 'CLOSED',
      createdAt: hoursAgo(115),
    },
  ];

  for (const history of histories) {
    await prisma.ticketHistory.upsert({
      where: { id: history.id },
      update: {},
      create: history,
    });
  }

  // Uma notificação não lida para o cliente: o sino já nasce com conteúdo.
  await prisma.notification.upsert({
    where: { id: 'demo-notification-wifi-comment' },
    update: {},
    create: {
      id: 'demo-notification-wifi-comment',
      userId: client.id,
      ticketId: 'demo-ticket-wifi',
      type: 'COMMENT',
      message: buildNotificationMessage({
        event: 'COMMENT',
        actorName: agent.name,
        ticketTitle: 'Notebook não conecta ao Wi-Fi do escritório',
      }),
      createdAt: hoursAgo(9),
    },
  });

  console.log('Seed de demonstração concluído.');
  console.log(`Empresa: ${company.name} (${company.code})`);
  for (const [role, user] of Object.entries(userByRole)) {
    console.log(`  ${role}: ${user.email}`);
  }
  console.log(`Senha das contas novas: ${DEMO_PASSWORD}`);
  console.log(`Chamados demo garantidos: ${tickets.length}`);
}

main()
  .catch((error) => {
    console.error('Falha ao executar o seed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
