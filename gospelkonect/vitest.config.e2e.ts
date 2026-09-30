import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Suites share ONE Postgres and ONE Redis, so they must not interleave:
    // a post created by posts.e2e would bump the feed cache version (and the
    // row counts) while feed.e2e is asserting on them. Sequential = slower,
    // but every assertion is then about this suite's own writes only.
    fileParallelism: false,
    // Password hashing is argon2id at OWASP cost (64 MB, 3 passes) and is
    // deliberately slow; three suites booting apps in parallel can push a
    // register+login chain past Vitest's 5s default.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
