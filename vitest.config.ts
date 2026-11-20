import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'packages/*/tests/**/*.test.ts',
      'packages/*/src/**/*.test.ts',
      'apps/*/tests/**/*.test.ts',
      'apps/*/src/**/*.test.ts',
    ],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@zerorez/shared': path.resolve(__dirname, 'packages/shared/src/index.ts'),
    },
  },
});
