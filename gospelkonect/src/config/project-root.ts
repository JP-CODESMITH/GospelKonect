// Locates the project root even when the process is not started from it.
//
// `prisma-composer dev` runs the bundled service with cwd set to its artifact
// directory (…/.prisma-composer/dev/artifacts/<hash>/bundle), and only injects
// the platform's own variables into the environment. Anything that assumes
// "cwd is the repo" — dotenv's implicit '.env', the uploads directory — then
// resolves inside a throwaway artifact folder and silently comes up empty
// (that is how DATABASE_URL went missing under Composer).
//
// So: walk up from the process cwd first (the normal case: node dist/main,
// vitest, nest start), then from this module's own location, which for the
// bundle lives under the repo. First directory containing package.json wins;
// failing both, fall back to cwd.

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The repository root containing package.json, or cwd when not found. */
export function projectRoot(): string {
  for (const start of [process.cwd(), dirname(fileURLToPath(import.meta.url))]) {
    let dir = start;
    for (;;) {
      if (existsSync(join(dir, 'package.json'))) return dir;
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return process.cwd();
}

/**
 * Absolute path to the project's .env, or undefined when absent — so deploys
 * that provide real environment variables (and no .env file) keep working.
 */
export function projectEnvFile(): string | undefined {
  const candidate = join(projectRoot(), '.env');
  return existsSync(candidate) ? candidate : undefined;
}
