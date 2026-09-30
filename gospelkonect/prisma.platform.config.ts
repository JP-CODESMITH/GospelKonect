// CLI config for the Prisma 8 / Composer toolchain, passed explicitly with
// `--config prisma.platform.config.ts`.
//
// It deliberately does NOT live at prisma.config.ts: that file belongs to the
// Prisma 7 CLI this project still uses for its ORM work (`prisma migrate dev`,
// `prisma generate`). The two CLIs use the same filename for different config
// shapes and refuse to read each other's, so each one gets its own file and
// the Composer invocations name theirs.
//
// This CLI recognises two sections, `composer` and `orm`. Both are optional
// here: the app needs no Composer extension settings beyond
// prisma-composer.config.ts, and no ORM section because Postgres is not yet a
// Composer resource (the Prisma 7 CLI keeps owning migrations).

import { definePrismaConfig } from 'prisma8/config';

export default definePrismaConfig({});
