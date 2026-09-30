import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { FeedController } from './feed.controller.js';
import { FeedService } from './feed.service.js';
import { FeedCacheService } from './feed-cache.service.js';

// Phase 6: the personalised home timeline.
// PrismaService and RedisService are both @Global, so neither is listed here.
@Module({
  // Guard resolves TokenService from AuthModule (same reason Posts/Users do).
  imports: [AuthModule],
  controllers: [FeedController],
  providers: [FeedService, FeedCacheService],
  // FeedCacheService is exported because PostsService and FollowsService must
  // invalidate it after any write that changes what a feed can show. The cache
  // lives here (with the feed) rather than in a global module so that its
  // invalidation contract is owned by the only feature that reads it.
  exports: [FeedCacheService],
})
export class FeedModule {}
