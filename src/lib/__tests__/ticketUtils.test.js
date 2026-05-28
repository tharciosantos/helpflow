import { describe, it, expect } from 'vitest';
import {
    getStatusDisplayNamePT,
    getStatusBadgeClasses,
    getPriorityBadge,
} from '../ticketUtils.js';

// ─────────────────────────────────────────────
// getStatusDisplayNamePT
// ─────────────────────────────────────────────
describe('getStatusDisplayNamePT', () => {
    it('deve retornar "Aberto" para OPEN', () => {
        expect(getStatusDisplayNamePT('OPEN')).toBe('Aberto');
    });

    it('deve retornar "Em Progresso" para IN_PROGRESS', () => {
        expect(getStatusDisplayNamePT('IN_PROGRESS')).toBe('Em Progresso');
    });

    it('deve retornar "Fechado" para CLOSED', () => {
        expect(getStatusDisplayNamePT('CLOSED')).toBe('Fechado');
    });

    it('deve retornar o próprio valor para status desconhecido', () => {
        expect(getStatusDisplayNamePT('UNKNOWN_STATUS')).toBe('UNKNOWN_STATUS');
    });

    it('deve retornar o próprio valor para string vazia', () => {
        expect(getStatusDisplayNamePT('')).toBe('');
    });
});

// ─────────────────────────────────────────────
// getStatusBadgeClasses
// ─────────────────────────────────────────────
describe('getStatusBadgeClasses', () => {
    it('deve retornar classes verdes para OPEN', () => {
        const classes = getStatusBadgeClasses('OPEN');
        expect(classes).toContain('green');
    });

    it('deve retornar classes amarelas para IN_PROGRESS', () => {
        const classes = getStatusBadgeClasses('IN_PROGRESS');
        expect(classes).toContain('yellow');
    });

    it('deve retornar classes cinzas para CLOSED', () => {
        const classes = getStatusBadgeClasses('CLOSED');
        expect(classes).toContain('gray');
    });

    it('deve retornar classes padrão (cinza) para status desconhecido', () => {
        const classes = getStatusBadgeClasses('QUALQUER_COISA');
        expect(classes).toContain('gray');
    });

    it('deve retornar uma string não vazia para qualquer entrada', () => {
        ['OPEN', 'IN_PROGRESS', 'CLOSED', 'INVALIDO'].forEach((status) => {
            expect(getStatusBadgeClasses(status)).toBeTruthy();
        });
    });
});

// ─────────────────────────────────────────────
// getPriorityBadge
// ─────────────────────────────────────────────
describe('getPriorityBadge', () => {
    it('deve retornar label "Baixa" para LOW', () => {
        const { label } = getPriorityBadge('LOW');
        expect(label).toBe('Baixa');
    });

    it('deve retornar label "Média" para MEDIUM', () => {
        const { label } = getPriorityBadge('MEDIUM');
        expect(label).toBe('Média');
    });

    it('deve retornar label "Alta" para HIGH', () => {
        const { label } = getPriorityBadge('HIGH');
        expect(label).toBe('Alta');
    });

    it('deve retornar label "Urgente" para URGENT', () => {
        const { label } = getPriorityBadge('URGENT');
        expect(label).toBe('Urgente');
    });

    it('deve retornar classes verdes para LOW', () => {
        const { classes } = getPriorityBadge('LOW');
        expect(classes).toContain('green');
    });

    it('deve retornar classes azuis para MEDIUM', () => {
        const { classes } = getPriorityBadge('MEDIUM');
        expect(classes).toContain('blue');
    });

    it('deve retornar classes laranja para HIGH', () => {
        const { classes } = getPriorityBadge('HIGH');
        expect(classes).toContain('orange');
    });

    it('deve retornar classes vermelhas para URGENT', () => {
        const { classes } = getPriorityBadge('URGENT');
        expect(classes).toContain('red');
    });

    it('deve retornar objeto com label e classes para prioridade desconhecida', () => {
        const result = getPriorityBadge('INVALIDO');
        expect(result).toHaveProperty('label');
        expect(result).toHaveProperty('classes');
        expect(result.label).toBe('INVALIDO'); // retorna o próprio valor como label
        expect(result.classes).toContain('gray');
    });

    it('deve retornar { label, classes } para todos os valores válidos', () => {
        ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].forEach((priority) => {
            const result = getPriorityBadge(priority);
            expect(result).toHaveProperty('label');
            expect(result).toHaveProperty('classes');
            expect(typeof result.label).toBe('string');
            expect(typeof result.classes).toBe('string');
        });
    });
});
