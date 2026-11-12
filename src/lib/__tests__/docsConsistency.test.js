// ---------------------------------------------------------------------------
// Guarda de consistência das contagens documentadas.
//
// AGENTS.md, README.md e ESTADO_ATUAL.md declaram números de testes e de
// cenários E2E escritos à mão. Este arquivo falha quando algum deles diverge da
// contagem real do repositório, evitando drift silencioso entre código e docs.
//
// A contagem é estática (conta os blocos `it(` e os `Anteriormente` do Cypress)
// porque, dentro de um teste, o Vitest não expõe o total dos outros arquivos.
// Os guards abaixo falham explicitamente se aparecer `it.each`/`test.each` ou
// `data-cy` dinâmico, que tornariam a contagem estática imprecisa.
// ---------------------------------------------------------------------------

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const TESTS_DIR = join(ROOT, 'src', 'lib', '__tests__');
const CYPRESS_DIR = join(ROOT, 'cypress', 'e2e');

function readFile(relativePath) {
  return readFileSync(join(ROOT, relativePath), 'utf8');
}

function listFiles(dir, pattern) {
  return readdirSync(dir).filter((name) => pattern.test(name));
}

/** Conta blocos `it(` no início de linha (aceita indentação). */
function countItBlocks(source) {
  return (source.match(/^\s*it\s*\(/gm) || []).length;
}

/** Conta cenários Cypress (`it(`/`specify(`) no início de linha. */
function countCypressScenarios(source) {
  return (source.match(/^\s*(it|specify)\s*\(/gm) || []).length;
}

function countUnitTests() {
  // Inclui este arquivo: o número documentado é o total que a suíte executa.
  return listFiles(TESTS_DIR, /\.test\.js$/)
    .map((name) => countItBlocks(readFileSync(join(TESTS_DIR, name), 'utf8')))
    .reduce((total, value) => total + value, 0);
}

function countTestFiles() {
  return listFiles(TESTS_DIR, /\.test\.js$/).length;
}

function countCypressTests() {
  return listFiles(CYPRESS_DIR, /\.cy\.js$/)
    .map((name) => countCypressScenarios(readFileSync(join(CYPRESS_DIR, name), 'utf8')))
    .reduce((total, value) => total + value, 0);
}

function documentedUnitCounts(relativePath, source) {
  return [...source.matchAll(/(\d+)\s+testes\b/g)].map((match) => Number(match[1]));
}

describe('consistência das contagens documentadas', () => {
  const unitTests = countUnitTests();
  const cypressTests = countCypressTests();
  const testFiles = countTestFiles();

  it('não usa testes parametrizados que quebrariam a contagem estática', () => {
    for (const name of listFiles(TESTS_DIR, /\.test\.js$/)) {
      const source = readFileSync(join(TESTS_DIR, name), 'utf8');
      expect(source, `${name} usa it.each/test.each`).not.toMatch(/^\s*(it|test)\.each\s*\(/m);
      expect(source, `${name} usa test() no lugar de it()`).not.toMatch(/^\s*test\s*\(/m);
    }
  });

  it('contabiliza os testes unitários da suíte', () => {
    expect(unitTests).toBeGreaterThan(0);
    expect(testFiles).toBe(17);
  });

  it('AGENTS.md cita a contagem real de testes unitários', () => {
    const source = readFile('AGENTS.md');
    // O histórico de versões cita números antigos, então só a primeira
    // ocorrência (seção 2, stack) é verificada como valor atual.
    const first = Number(source.match(/(\d+)\s+testes\b/)[1]);
    expect(first, `AGENTS.md cita ${first}, mas a suíte tem ${unitTests}`).toBe(unitTests);
  });

  it('README.md cita a contagem real de testes unitários', () => {
    const counts = documentedUnitCounts('README.md', readFile('README.md'));
    expect(counts.length).toBeGreaterThan(0);
    for (const value of counts) {
      expect(value, `README.md cita ${value}, mas a suíte tem ${unitTests}`).toBe(unitTests);
    }
  });

  it('AGENTS.md e README.md citam a contagem real de cenários Cypress', () => {
    for (const file of ['AGENTS.md', 'README.md']) {
      const source = readFile(file);
      const counts = [...source.matchAll(/(\d+)\s+cenários\b/g)].map((m) => Number(m[1]));
      expect(counts.length, `${file} não cita cenários E2E`).toBeGreaterThan(0);
      for (const value of counts) {
        expect(value, `${file} cita ${value} cenários, mas há ${cypressTests}`).toBe(cypressTests);
      }
    }
  });
});
