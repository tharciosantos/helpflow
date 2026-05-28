import { describe, it, expect } from 'vitest';
import {
    createTicketSchema,
    updateTicketStatusSchema,
    updateTicketSchema,
    registerSchema,
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
        });
        expect(result.success).toBe(true);
    });

    it('deve aceitar registro sem nome (name é opcional)', () => {
        const result = registerSchema.safeParse({
            email: 'joao@exemplo.com',
            password: 'senha1234',
        });
        expect(result.success).toBe(true);
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
