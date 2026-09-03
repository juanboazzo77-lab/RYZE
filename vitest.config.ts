import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      // `server-only` aborta fuera de un React Server Component; en los tests
      // (Node puro) lo reemplazamos por un módulo vacío.
      'server-only': resolve(__dirname, 'tests/server-only-shim.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
  },
});
