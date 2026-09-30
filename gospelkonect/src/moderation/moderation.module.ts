// ModerationModule — Phase 9's write side: blocks, reports, the admin
// console, and the bootstrap that grants the first administrators.
//
// Imports the owner modules (posts, engagement, media) so destructive actions
// can delegate to them instead of re-implementing their cascades; none of
// those import this module, so there is no cycle.

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SecurityModule } from '../security/security.module.js';
import { PostsModule } from '../posts/posts.module.js';
import { EngagementModule } from '../engagement/engagement.module.js';
import { MediaModule } from '../media/media.module.js';
import { FeedModule } from '../feed/feed.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { BlocksController } from './blocks.controller.js';
import { ReportsController } from './reports.controller.js';
import { AdminUsersController } from './admin-users.controller.js';
import { AdminContentController } from './admin-content.controller.js';
import { AdminReportsController } from './admin-reports.controller.js';
import { BlocksService } from './blocks.service.js';
import { ReportsService } from './reports.service.js';
import { AdminService } from './admin.service.js';
import { AdminGuard } from './admin.guard.js';
import { AdminBootstrapService } from './admin-bootstrap.service.js';

@Module({
  imports: [
    AuthModule,
    SecurityModule,
    PostsModule,
    EngagementModule,
    MediaModule,
    FeedModule,
    NotificationsModule,
  ],
  controllers: [
    BlocksController,
    ReportsController,
    AdminUsersController,
    AdminContentController,
    AdminReportsController,
  ],
  providers: [BlocksService, ReportsService, AdminService, AdminGuard, AdminBootstrapService],
  exports: [BlocksService, ReportsService],
})
export class ModerationModule {}
