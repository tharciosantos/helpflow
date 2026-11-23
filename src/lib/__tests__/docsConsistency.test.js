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

function documentedCypressCounts(source) {
  return [...source.matchAll(/(\d+)\s+cenários\b/g)].map((match) => Number(match[1]));
}

function countCypressSpecs() {
  return listFiles(CYPRESS_DIR, /\.cy\.js$/).length;
}

/**
 * Exige que o documento cite a contagem e que toda ocorrência seja o valor
 * real. `testFiles` opcional valida também "N arquivos"/"N specs".
 */
function expectDocumentedCounts(file, source, { unitTests, cypressTests, testFiles, cypressSpecs }) {
  const unitCounts = documentedUnitCounts(file, source);
  expect(unitCounts.length, `${file} não cita testes unitários`).toBeGreaterThan(0);
  for (const value of unitCounts) {
    expect(value, `${file} cita ${value} testes, mas a suíte tem ${unitTests}`).toBe(unitTests);
  }

  const cypressCounts = documentedCypressCounts(source);
  expect(cypressCounts.length, `${file} não cita cenários E2E`).toBeGreaterThan(0);
  for (const value of cypressCounts) {
    expect(value, `${file} cita ${value} cenários, mas há ${cypressTests}`).toBe(cypressTests);
  }

  if (testFiles !== undefined) {
    for (const match of source.matchAll(/(\d+)\s+arquivos\b/g)) {
      expect(Number(match[1]), `${file} cita ${match[1]} arquivos, mas há ${testFiles}`).toBe(testFiles);
    }
  }

  if (cypressSpecs !== undefined) {
    for (const match of source.matchAll(/(\d+)\s+specs\b/g)) {
      expect(Number(match[1]), `${file} cita ${match[1]} specs, mas há ${cypressSpecs}`).toBe(cypressSpecs);
    }
  }
}

describe('consistência das contagens documentadas', () => {
  const unitTests = countUnitTests();
  const cypressTests = countCypressTests();
  const testFiles = countTestFiles();
  const cypressSpecs = countCypressSpecs();

  it('não usa testes parametrizados que quebrariam a contagem estática', () => {
    for (const name of listFiles(TESTS_DIR, /\.test\.js$/)) {
      const source = readFileSync(join(TESTS_DIR, name), 'utf8');
      expect(source, `${name} usa it.each/test.each`).not.toMatch(/^\s*(it|test)\.each\s*\(/m);
      expect(source, `${name} usa test() no lugar de it()`).not.toMatch(/^\s*test\s*\(/m);
    }
  });

  it('contabiliza os testes unitários da suíte', () => {
    expect(unitTests).toBeGreaterThan(0);
    expect(testFiles).toBeGreaterThanOrEqual(23);
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
      const counts = documentedCypressCounts(source);
      expect(counts.length, `${file} não cita cenários E2E`).toBeGreaterThan(0);
      for (const value of counts) {
        expect(value, `${file} cita ${value} cenários, mas há ${cypressTests}`).toBe(cypressTests);
      }
    }
  });

  it('o backlog versionado existe e cita a data de atualização', () => {
    // AUD-46: docs/AUDITORIA-2026-11-21.md é a fonte viva do backlog e agora é
    // versionado — o guard garante que ele (a) está no repositório e (b) teve o
    // cabeçalho atualizado junto com a última entrega. As contagens ficam fora
    // de propósito: o relatório cita números históricos por fase e exigir o
    // total atual o faria falhar a cada revisão.
    const source = readFile('docs/AUDITORIA-2026-11-21.md');
    expect(source, 'backlog versionado sem data de atualização').toMatch(
      /Atualização\s*\(\d{2}\/\d{2}\/\d{4}\)/
    );
  });

  it('ESTADO_ATUAL.md cita as contagens reais e a data de atualização', () => {
    // ESTADO_ATUAL.md é controle local (ignorado pelo git): se não existir
    // neste clone, nada a validar. Commit, branches e fases ficam fora do
    // guard de propósito — mudam a cada merge e tornariam o teste frágil.
    let source;
    try {
      source = readFile('ESTADO_ATUAL.md');
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    // Só o cabeçalho e a seção "Onde estamos": a tabela de fases cita
    // contagens históricas da época de cada PR.
    const header = source.split(/^## Fases concluídas/m)[0];
    expect(header, 'ESTADO_ATUAL.md sem data de atualização').toMatch(/Última atualização:\s*\d{2}\/\d{2}\/\d{4}/);
    expect(header, 'ESTADO_ATUAL.md sem commit da main').toMatch(/main em `[0-9a-f]{7,40}`/);
    expectDocumentedCounts('ESTADO_ATUAL.md', header, { unitTests, cypressTests, testFiles, cypressSpecs });
  });
});
