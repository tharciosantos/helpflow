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
        error: 'Status inválido.',
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
    // Permite editar status e prioridade também pelo formulário de edição
    status: z.enum(['OPEN', 'IN_PROGRESS', 'CLOSED']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
});

export const registerSchema = z.object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres.').optional(),
    email: z.string().email('Email inválido.'),
    password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.'),
    confirmPassword: z.string().min(8, 'A confirmação de senha deve ter pelo menos 8 caracteres.'),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
});

// Schema para solicitar reset de senha
export const forgotPasswordSchema = z.object({
    email: z
        .string({ required_error: 'Email é obrigatório.' })
        .email('Email inválido.'),
});

// Schema para redefinir senha
export const resetPasswordSchema = z.object({
    token: z
        .string({ required_error: 'Token é obrigatório.' })
        .min(1, 'Token inválido.'),
    password: z
        .string({ required_error: 'Senha é obrigatória.' })
        .min(8, 'A senha deve ter pelo menos 8 caracteres.'),
    confirmPassword: z
        .string({ required_error: 'Confirmação é obrigatória.' })
        .min(8, 'A confirmação deve ter pelo menos 8 caracteres.'),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
});