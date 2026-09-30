// The Prisma Composer declaration for this API: what the service *is* (name,
// dependencies, build), never how it runs.
//
// Pure data — importing this file executes nothing. The CLI reads it to
// assemble the app graph; `src/composer-runtime.ts` reads it at boot for the
// few values Composer injects (port, bucket credentials).

import node from '@prisma/composer/node';
import { bucket, compute } from '@prisma/composer-prisma-cloud';

export default compute({
  // `api`, not `gospelkonect`: a service sharing its Module's name is
  // addressed `gospelkonect.gospelkonect` by the deploy report.
  name: 'api',
  // The media bucket this phase is about: `service.load().media` yields
  // `{ url, bucket, accessKeyId, secretAccessKey }`, and the app builds its
  // own S3 client from it (no SDK configuration, no hardcoded endpoints).
  //
  // Postgres stays outside Composer for now: the app keeps its Prisma 7
  // migrations and reads DATABASE_URL exactly as before. Moving the database
  // behind `rawPostgres()` is a separate step that must not be mixed into the
  // media work.
  deps: { media: bucket() },
  // The built server: one self-contained ESM file, produced by
  // scripts/build-server.mjs (SWC for Nest's decorator metadata, Bun for the
  // bundle). tsc's dist/main.js is deliberately NOT the entry — Composer copies
  // this single file and boots it without dist/'s siblings or node_modules.
  build: node({ module: import.meta.url, entry: '../dist/server.mjs' }),
});
