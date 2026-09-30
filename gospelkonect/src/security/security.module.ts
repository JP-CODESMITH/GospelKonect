// SecurityModule — the Redis-backed write throttle. Imported by whichever
// module wants a route limited; Prisma/Redis/Config are global, so nothing
// else needs listing here.

import { Module } from '@nestjs/common';
import { RateLimitService } from './rate-limit.service.js';

@Module({
  providers: [RateLimitService],
  exports: [RateLimitService],
})
export class SecurityModule {}
