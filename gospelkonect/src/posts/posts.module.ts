import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PostsController } from './posts.controller.js';
import { UserPostsController } from './user-posts.controller.js';
import { PostsService } from './posts.service.js';
import { FeedModule } from '../feed/feed.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { MediaModule } from '../media/media.module.js';
import { EngagementModule } from '../engagement/engagement.module.js';

// Phase 4: the post feed, single-post reads, edits and deletes.
// PrismaModule is @Global and ConfigModule is global, so neither is listed.
@Module({
  // Guards resolve TokenService from AuthModule — same reason UsersModule
  // imports it. AuthModule imports nothing from here, so no cycle.
  // AuthModule for the guards; FeedModule for FeedCacheService, which
  // PostsService bumps after every write (a new/edited/deleted post changes
  // everyone's feed). FeedModule imports neither PostsModule nor UsersModule,
  // so this cannot form a cycle.
  // NotificationsModule: publishing a post notifies everyone it mentions.
  // MediaModule: PostsService validates attachment ids and cleans up orphaned
  // blobs when a post is deleted.
  // EngagementModule: the reaction routes hang off PostsController but the
  // service lives there; it imports Feed/Notifications too, never PostsModule.
  imports: [AuthModule, FeedModule, NotificationsModule, MediaModule, EngagementModule],
  // Two controllers on purpose: /posts/* and /users/:username/posts.
  controllers: [PostsController, UserPostsController],
  providers: [PostsService],
  // Exported so a later module (notifications, search) can reuse the shapes.
  exports: [PostsService],
})
export class PostsModule {}
