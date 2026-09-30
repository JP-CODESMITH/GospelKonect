import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import envConfig from './config/env.config.js';
// Under `prisma-composer dev` cwd is the artifact dir, not the repo, so the
// implicit '.env' lookup misses; resolve it from the project root instead.
import { projectEnvFile } from './config/project-root.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { UsersModule } from './users/users.module.js';
import { PostsModule } from './posts/posts.module.js';
import { FeedModule } from './feed/feed.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';

@Module({
  // AppController was previously not registered here, so GET /api/v1 answered
  // 404 and the e2e health check could never pass.
  controllers: [AppController],
  providers: [AppService],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
      envFilePath: projectEnvFile(),
    }),
    // Registers all /auth/* routes (login, register). Without this import,
    // Nest never mounts AuthController and every /auth call returns 404.
    AuthModule,
    // NOTE: importing RedisModule activates its @Global() provider, making
    // RedisService injectable everywhere without re-importing. Order matters:
    // it must be listed here (after ConfigModule, which RedisService reads).
    RedisModule,
    // @Global PrismaService — must be imported exactly once, here at the root,
    // so every other module shares a single connection pool.
    PrismaModule,
    // Phase 3: profile reads/edits, follow graph, discovery.
    UsersModule,
    // Phase 4: posts, feeds and post ownership.
    PostsModule,
    // Phase 6: the personalised home timeline.
    FeedModule,
    // Phase 7: notification records, inbox and Redis publish.
    NotificationsModule,
  ],
})
export class AppModule {}
