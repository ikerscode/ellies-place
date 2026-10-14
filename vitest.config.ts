import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    // Node by default; a test that needs a DOM starts with `// @vitest-environment happy-dom` (FROZEN 36).
    environment: 'node',
    passWithNoTests: false,
  },
});
