import { defineConfig } from 'vitest/config';

// A suíte cobre apenas funções puras de `src/lib/`, sem componentes React.
// O ambiente `node` (padrão do Vitest) é declarado explicitamente para que a
// política "sem jsdom, sem Testing Library" não dependa de defaults implícitos.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/lib/__tests__/**/*.test.js'],
    globals: false,
  },
});
