import { z } from 'zod';

export const createTicketSchema = z.object({
    title: z
        .string({ required_error: 'O título é obrigatório.' })
        .min(5, 'O título deve ter pelo menos 5 caracteres.')
        .max(100, 'O título não pode ter mais de 100 caracteres.')
        .trim(),
    description: z
        .string({ required_error: 'A descrição é obrigatória.' })
        .min(1, 'A descrição é obrigatória.')
        .max(2000, 'A descrição não pode ter mais de 2000 caracteres.')
        .trim(),
    // optional: se não vier no body, o Zod simplesmente ignora
    // e o Prisma usa o @default(MEDIUM) do schema.prisma
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
});

export const updateTicketStatusSchema = z.object({
    status: z.enum(['OPEN', 'IN_PROGRESS', 'CLOSED'], {
        errorMap: () => ({ message: 'Status inválido.' }),
    }),
});

export const updateTicketSchema = z.object({
    title: z
        .string()
        .min(5, 'O título deve ter pelo menos 5 caracteres.')
        .max(100, 'O título não pode ter mais de 100 caracteres.')
        .trim()
        .optional(),
    description: z
        .string()
        .max(2000, 'A descrição não pode ter mais de 2000 caracteres.')
        .trim()
        .optional(),
});

export const registerSchema = z.object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres.').optional(),
    email: z.string().email('Email inválido.'),
    password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.'),
});