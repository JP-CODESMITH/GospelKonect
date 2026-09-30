import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { MediaController } from './media.controller.js';
import { MediaService } from './media.service.js';
import { StorageBackendProvider } from './storage.js';
import { SecurityModule } from '../security/security.module.js';

// Phase 8: the upload pipeline.
// PrismaModule and ConfigModule are global, so neither is listed; AuthModule
// supplies the guard behind the authenticated routes.
@Module({
  // AuthModule exports the TokenService the guard resolves. It imports
  // nothing from here, so there is no cycle.
  imports: [AuthModule, SecurityModule],
  controllers: [MediaController],
  providers: [MediaService, StorageBackendProvider],
  // Exported: PostsModule attaches blobs to posts, UsersModule stores
  // avatars through the very same pipeline.
  exports: [MediaService],
})
export class MediaModule {}
