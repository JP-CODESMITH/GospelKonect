import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Password hashing is argon2id at OWASP cost (64 MB, 3 passes) and is
    // deliberately slow; three suites booting apps in parallel can push a
    // register+login chain past Vitest's 5s default.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
