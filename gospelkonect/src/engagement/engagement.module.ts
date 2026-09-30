// EngagementModule — Phase 5's write side: comments and reactions.
//
// Imports only what a comment needs to exist (auth for the caller, the feed
// cache so commentCount/reactions stay fresh, notifications for the inbox).
// PostsModule imports IT for the reaction routes, never the other way round,
// so there is no module cycle.

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { FeedModule } from '../feed/feed.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { PostCommentsController } from './post-comments.controller.js';
import { CommentController } from './comment.controller.js';
import { CommentsService } from './comments.service.js';
import { ReactionsService } from './reactions.service.js';

@Module({
  imports: [AuthModule, FeedModule, NotificationsModule],
  controllers: [PostCommentsController, CommentController],
  providers: [CommentsService, ReactionsService],
  exports: [CommentsService, ReactionsService],
})
export class EngagementModule {}
