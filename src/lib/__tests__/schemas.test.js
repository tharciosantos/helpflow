import { describe, it, expect } from 'vitest';
import {
    createTicketSchema,
    updateTicketStatusSchema,
    updateTicketSchema,
    registerSchema,
    registerCompanySchema,
    registerEmployeeSchema,
    generateCompanyCode,
    createCommentSchema,
    forgotPasswordSchema,
} from '../schemas.js';

// ─────────────────────────────────────────────
// createTicketSchema
// ─────────────────────────────────────────────
describe('createTicketSchema', () => {
    it('deve aceitar dados válidos com todos os campos', () => {
        const result = createTicketSchema.safeParse({
            title: 'Problema no sistema',
            description: 'O sistema apresentou erro ao salvar.',
            priority: 'HIGH',
        });
        expect(result.success).toBe(true);
    });

    it('deve aceitar dados válidos sem priority (campo opcional)', () => {
        const result = createTicketSchema.safeParse({
            title: 'Ticket sem prioridade',
            description: 'Descrição do problema.',
        });
        expect(result.success).toBe(true);
        expect(result.data.priority).toBeUndefined();
    });

    it('deve rejeitar título com menos de 5 caracteres', () => {
        const result = createTicketSchema.safeParse({
            title: 'Bug',
            description: 'Descrição válida.',
        });
        expect(result.success).toBe(false);
        expect(result.error.flatten().fieldErrors.title).toBeDefined();
    });

    it('deve rejeitar título com mais de 100 caracteres', () => {
        const result = createTicketSchema.safeParse({
            title: 'A'.repeat(101),
            description: 'Descrição válida.',
        });
        expect(result.success).toBe(false);
        expect(result.error.flatten().fieldErrors.title).toBeDefined();
    });

    it('deve rejeitar descrição vazia', () => {
        const result = createTicketSchema.safeParse({
            title: 'Título válido',
            description: '',
        });
        expect(result.success).toBe(false);
        expect(result.error.flatten().fieldErrors.description).toBeDefined();
    });

    it('deve rejeitar priority com valor inválido', () => {
        const result = createTicketSchema.safeParse({
            title: 'Título válido',
            description: 'Descrição válida.',
            priority: 'CRITICAL', // valor não definido no enum
        });
        expect(result.success).toBe(false);
        expect(result.error.flatten().fieldErrors.priority).toBeDefined();
    });

    it('deve aceitar todos os valores válidos de priority', () => {
        const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
        validPriorities.forEach((priority) => {
            const result = createTicketSchema.safeParse({
                title: 'Título válido',
                description: 'Descrição válida.',
                priority,
            });
            expect(result.success).toBe(true);
        });
    });

    it('deve fazer trim no título e na descrição', () => {
        const result = createTicketSchema.safeParse({
            title: '  Título com espaços  ',
            description: '  Descrição com espaços  ',
        });
        expect(result.success).toBe(true);
        expect(result.data.title).toBe('Título com espaços');
        expect(result.data.description).toBe('Descrição com espaços');
    });
});

// ─────────────────────────────────────────────
// updateTicketStatusSchema
// ─────────────────────────────────────────────
describe('updateTicketStatusSchema', () => {
    it('deve aceitar status OPEN', () => {
        expect(updateTicketStatusSchema.safeParse({ status: 'OPEN' }).success).toBe(true);
    });

    it('deve aceitar status IN_PROGRESS', () => {
        expect(updateTicketStatusSchema.safeParse({ status: 'IN_PROGRESS' }).success).toBe(true);
    });

    it('deve aceitar status CLOSED', () => {
        expect(updateTicketStatusSchema.safeParse({ status: 'CLOSED' }).success).toBe(true);
    });

    it('deve rejeitar status inválido', () => {
        const result = updateTicketStatusSchema.safeParse({ status: 'PENDING' });
        expect(result.success).toBe(false);
        expect(result.error.flatten().fieldErrors.status).toBeDefined();
    });

    it('deve rejeitar status vazio', () => {
        const result = updateTicketStatusSchema.safeParse({ status: '' });
        expect(result.success).toBe(false);
    });

    it('deve retornar mensagem de erro customizada para status inválido', () => {
        const result = updateTicketStatusSchema.safeParse({ status: 'INVALIDO' });
        expect(result.success).toBe(false);
        const messages = result.error.flatten().fieldErrors.status;
        expect(messages).toContain('Status inválido.');
    });

    it('deve rejeitar campos desconhecidos (schema estrito)', () => {
        const result = updateTicketStatusSchema.safeParse({ status: 'OPEN', statuss: 'CLOSED' });
        expect(result.success).toBe(false);
    });

    it('deve rejeitar campos de triagem no PATCH mínimo de status', () => {
        // Antes do .strict() o dueAt era descartado em silêncio; agora o erro
        // aparece em vez de a rota seguir com um payload suspeito.
        const result = updateTicketStatusSchema.safeParse({ status: 'CLOSED', dueAt: null });
        expect(result.success).toBe(false);
    });

    it('deve aceitar expectedUpdatedAt (controle de concorrência)', () => {
        // Metadado do update otimista: acompanha o PATCH de status sem ser
        // conteúdo do chamado.
        const result = updateTicketStatusSchema.safeParse({
            status: 'IN_PROGRESS',
            expectedUpdatedAt: '2026-11-12T10:00:00.000Z',
        });
        expect(result.success).toBe(true);
    });
});

// ─────────────────────────────────────────────
// updateTicketSchema
// ─────────────────────────────────────────────
describe('updateTicketSchema', () => {
    it('deve aceitar objeto vazio (todos os campos são opcionais)', () => {
        const result = updateTicketSchema.safeParse({});
        expect(result.success).toBe(true);
    });

    it('deve aceitar atualização parcial somente com title', () => {
        const result = updateTicketSchema.safeParse({ title: 'Novo título aqui' });
        expect(result.success).toBe(true);
    });

    it('deve rejeitar title com menos de 5 caracteres', () => {
        const result = updateTicketSchema.safeParse({ title: 'Bug' });
        expect(result.success).toBe(false);
    });

    it('deve aceitar atualização com status e priority', () => {
        const result = updateTicketSchema.safeParse({
            status: 'CLOSED',
            priority: 'URGENT',
        });
        expect(result.success).toBe(true);
    });

    it('deve aceitar a atribuição a um agente ou a remoção do responsável', () => {
        expect(updateTicketSchema.safeParse({ agentId: '550e8400-e29b-41d4-a716-446655440000' }).success).toBe(true);
        expect(updateTicketSchema.safeParse({ agentId: null }).success).toBe(true);
    });

    it('deve rejeitar um identificador de agente inválido', () => {
        expect(updateTicketSchema.safeParse({ agentId: 'agente-invalido' }).success).toBe(false);
    });

    it('deve aceitar dueAt ISO com fuso ou null para limpar', () => {
        expect(updateTicketSchema.safeParse({ dueAt: '2026-10-20T17:30:00.000Z' }).success).toBe(true);
        expect(updateTicketSchema.safeParse({ dueAt: null }).success).toBe(true);
        expect(updateTicketSchema.safeParse({ recalcDue: true }).success).toBe(true);
    });

    it('deve rejeitar dueAt vazio', () => {
        expect(updateTicketSchema.safeParse({ dueAt: '' }).success).toBe(false);
    });
});

// ─────────────────────────────────────────────
// registerSchema
// ─────────────────────────────────────────────
describe('registerSchema', () => {
    it('deve aceitar dados de registro válidos', () => {
        const result = registerSchema.safeParse({
            name: 'João Silva',
            email: 'joao@exemplo.com',
            password: 'senha1234',
            confirmPassword: 'senha1234',
        });
        expect(result.success).toBe(true);
    });

    it('deve rejeitar registro sem nome', () => {
        const result = registerSchema.safeParse({
            email: 'joao@exemplo.com',
            password: 'senha1234',
            confirmPassword: 'senha1234',
        });
        expect(result.success).toBe(false);
        expect(result.error.flatten().fieldErrors.name).toBeDefined();
    });

    it('deve rejeitar email inválido', () => {
        const result = registerSchema.safeParse({
            email: 'nao-e-um-email',
            password: 'senha1234',
        });
        expect(result.success).toBe(false);
        expect(result.error.flatten().fieldErrors.email).toBeDefined();
    });

    it('deve rejeitar senha com menos de 8 caracteres', () => {
        const result = registerSchema.safeParse({
            email: 'joao@exemplo.com',
            password: '1234567',
        });
        expect(result.success).toBe(false);
        expect(result.error.flatten().fieldErrors.password).toBeDefined();
    });

    it('deve rejeitar nome com menos de 2 caracteres', () => {
        const result = registerSchema.safeParse({
            name: 'A',
            email: 'joao@exemplo.com',
            password: 'senha1234',
        });
        expect(result.success).toBe(false);
        expect(result.error.flatten().fieldErrors.name).toBeDefined();
    });
});

// ─────────────────────────────────────────────
// registerCompanySchema & registerEmployeeSchema
// ─────────────────────────────────────────────
describe('registerCompanySchema & registerEmployeeSchema', () => {
    it('deve aceitar dados válidos de cadastro de empresa', () => {
        const result = registerCompanySchema.safeParse({
            name: 'Carlos Gestor',
            companyName: 'Tech Inovações',
            email: 'carlos@techinovacoes.com',
            password: 'senhaSegura123',
            confirmPassword: 'senhaSegura123',
        });
        expect(result.success).toBe(true);
    });

    it('deve rejeitar cadastro de empresa sem companyName', () => {
        const result = registerCompanySchema.safeParse({
            name: 'Carlos Gestor',
            email: 'carlos@techinovacoes.com',
            password: 'senhaSegura123',
            confirmPassword: 'senhaSegura123',
        });
        expect(result.success).toBe(false);
        expect(result.error.flatten().fieldErrors.companyName).toBeDefined();
    });

    it('deve aceitar dados válidos de cadastro de funcionário com código', () => {
        const result = registerEmployeeSchema.safeParse({
            accountType: 'EMPLOYEE',
            name: 'Ana Silva',
            companyCode: 'TECH-4821',
            email: 'ana@techinovacoes.com',
            password: 'senhaSegura123',
            confirmPassword: 'senhaSegura123',
        });
        expect(result.success).toBe(true);
    });

    it('deve rejeitar funcionário com código muito curto ou ausente', () => {
        const result = registerEmployeeSchema.safeParse({
            accountType: 'EMPLOYEE',
            name: 'Ana Silva',
            companyCode: 'A',
            email: 'ana@techinovacoes.com',
            password: 'senhaSegura123',
            confirmPassword: 'senhaSegura123',
        });
        expect(result.success).toBe(false);
        expect(result.error.flatten().fieldErrors.companyCode).toBeDefined();
    });

    it('deve gerar código amigável de empresa com prefixo correto', () => {
        const code = generateCompanyCode('Tech Corp');
        expect(code).toMatch(/^TECH-\d{4}$/);
    });
});

// ─────────────────────────────────────────────
// createCommentSchema
// ─────────────────────────────────────────────
describe('createCommentSchema', () => {
    it('deve aceitar comentário válido', () => {
        const result = createCommentSchema.safeParse({
            content: 'Já reiniciei a máquina e o erro persiste.',
        });
        expect(result.success).toBe(true);
        expect(result.data.content).toBe('Já reiniciei a máquina e o erro persiste.');
    });

    it('deve rejeitar comentário vazio ou apenas com espaços', () => {
        const result = createCommentSchema.safeParse({
            content: '   ',
        });
        expect(result.success).toBe(false);
        expect(result.error.flatten().fieldErrors.content).toBeDefined();
    });

    it('deve rejeitar comentário com mais de 2000 caracteres', () => {
        const result = createCommentSchema.safeParse({
            content: 'A'.repeat(2001),
        });
        expect(result.success).toBe(false);
        expect(result.error.flatten().fieldErrors.content).toBeDefined();
    });
});

// ─────────────────────────────────────────────
// Normalização de e-mail (login e recuperação)
// ─────────────────────────────────────────────
describe('normalização de e-mail', () => {
    it('registerSchema normaliza e-mail com espaços e maiúsculas', () => {
        const result = registerSchema.safeParse({
            name: 'João Silva',
            email: '  Joao@Exemplo.COM ',
            password: 'senha1234',
            confirmPassword: 'senha1234',
        });
        expect(result.success).toBe(true);
        expect(result.data.email).toBe('joao@exemplo.com');
    });

    it('forgotPasswordSchema normaliza e-mail com espaços e maiúsculas', () => {
        const result = forgotPasswordSchema.safeParse({
            email: '  Joao@Exemplo.COM ',
        });
        expect(result.success).toBe(true);
        expect(result.data.email).toBe('joao@exemplo.com');
    });

    it('forgotPasswordSchema rejeita e-mail inválido', () => {
        const result = forgotPasswordSchema.safeParse({ email: 'nao-e-um-email' });
        expect(result.success).toBe(false);
        expect(result.error.flatten().fieldErrors.email).toBeDefined();
    });
});

