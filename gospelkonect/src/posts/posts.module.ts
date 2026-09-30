import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PostsController } from './posts.controller.js';
import { UserPostsController } from './user-posts.controller.js';
import { PostsService } from './posts.service.js';

// Phase 4: the post feed, single-post reads, edits and deletes.
// PrismaModule is @Global and ConfigModule is global, so neither is listed.
@Module({
  // Guards resolve TokenService from AuthModule — same reason UsersModule
  // imports it. AuthModule imports nothing from here, so no cycle.
  imports: [AuthModule],
  // Two controllers on purpose: /posts/* and /users/:username/posts.
  controllers: [PostsController, UserPostsController],
  providers: [PostsService],
  // Exported so a later module (notifications, search) can reuse the shapes.
  exports: [PostsService],
})
export class PostsModule {}
