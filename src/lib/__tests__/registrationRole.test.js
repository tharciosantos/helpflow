import { describe, expect, it } from 'vitest';
import { resolveRegistrationRole } from '../registrationRole';

describe('papel no cadastro', () => {
  it('atribui CLIENT a todo cadastro público', () => {
    expect(resolveRegistrationRole({ requestedRole: 'AGENT' })).toBe('CLIENT');
    expect(resolveRegistrationRole({ requestedRole: 'CLIENT' })).toBe('CLIENT');
  });

  it('só permite AGENT com o segredo de testes configurado e correto', () => {
    expect(resolveRegistrationRole({
      requestedRole: 'AGENT',
      testSecret: 'correto',
      configuredTestSecret: 'correto',
      environment: 'test',
    })).toBe('AGENT');
    expect(resolveRegistrationRole({
      requestedRole: 'AGENT',
      testSecret: 'errado',
      configuredTestSecret: 'correto',
      environment: 'test',
    })).toBe('CLIENT');
  });

  it('nunca permite criar AGENT em produção', () => {
    expect(resolveRegistrationRole({
      requestedRole: 'AGENT',
      testSecret: 'correto',
      configuredTestSecret: 'correto',
      environment: 'production',
    })).toBe('CLIENT');
  });
});
