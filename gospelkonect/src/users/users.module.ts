import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { FollowsService } from './follows.service.js';
import { LocalStorageService } from '../storage/local-storage.service.js';

// Phase 3: profiles, the follow graph, and discovery.
// PrismaService and ConfigService are both global, so this module only lists
// the providers it actually owns.
@Module({
  // Guards are instantiated in the module that owns the controller, so
  // AuthModule's exported TokenService must be reachable from here. Safe:
  // AuthModule imports nothing from UsersModule, so there is no cycle.
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService, FollowsService, LocalStorageService],
  // Exported so a future module (e.g. notifications) can reuse profile lookups.
  exports: [UsersService, FollowsService],
})
export class UsersModule {}
