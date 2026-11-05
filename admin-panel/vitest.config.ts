import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'server-only': resolve(__dirname, 'server-only-shim.ts'),
    },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
