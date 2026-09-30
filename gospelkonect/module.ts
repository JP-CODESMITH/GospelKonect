// The Prisma App: the root Module, and the whole app graph in one file.
//
// Loaded by `prisma-composer dev module.ts` / `prisma-composer deploy module.ts`.
// Relative imports carry explicit .ts extensions — that is the form Composer
// resolves everywhere (Node runs this file directly, so it must name the real
// source file).

import { module } from '@prisma/composer';
import { bucket } from '@prisma/composer-prisma-cloud';
import api from './src/service.ts';

export default module('gospelkonect', ({ provision }) => {
  // The one place the bucket exists. Provision ids must be ASCII alphanumerics
  // (they become config keys), so `media`, not `media-bucket`.
  const media = provision(bucket({ name: 'media' }));

  // `media` is the dependency binding: wired to the service's declared
  // `deps.media` slot. The compiler checks this edge, not the deploy.
  provision(api, { deps: { media } });
});
