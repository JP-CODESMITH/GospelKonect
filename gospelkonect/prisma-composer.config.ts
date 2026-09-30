// Deploy configuration for the Composer CLI. Read by `prisma-composer
// dev|deploy|destroy`, never imported by application code — that is why it
// lives at the repository root next to module.ts instead of in src/.
//
// Note this is a *second* config file: prisma.config.ts (Prisma 7) still
// configures the ORM commands (`prisma migrate dev` and friends) and is left
// untouched. The two CLIs do not share a file.

import { defineConfig } from '@prisma/composer/config';
import { nodeBuild } from '@prisma/composer/node/control';
import { prismaCloud, prismaState } from '@prisma/composer-prisma-cloud/control';

export default defineConfig({
  // prismaCloud(): the deploy target (Prisma Cloud / Prisma Compute).
  // nodeBuild(): the `node({ module, entry })` build adapter used in
  // src/service.ts — an adapter must be registered or the CLI refuses it.
  extensions: [prismaCloud(), nodeBuild()],
  // Where deploy/dev state is recorded, so re-deploys converge instead of
  // recreating everything.
  state: prismaState(),
});
