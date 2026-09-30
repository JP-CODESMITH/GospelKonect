import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';

// Phase 7: notification records, inbox endpoints and the Redis publish.
// PrismaService and RedisService are both @Global, so neither is listed.
@Module({
  // Guard resolves TokenService from AuthModule (same as Posts/Users/Feed).
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  // Exported so FollowsService (new follower) and PostsService (mentions)
  // can emit. This module imports neither of them, so no cycle.
  exports: [NotificationsService],
})
export class NotificationsModule {}
