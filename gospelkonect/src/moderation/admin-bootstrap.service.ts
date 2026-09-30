// AdminBootstrapService — grants ADMIN to the accounts named in
// ADMIN_USERNAMES when the process boots.
//
// The environment's first moderator is provisioned by configuration rather
// than by hand-written SQL, and re-running boot is harmless (already-promoted
// rows are left alone). Login has the same rule in AuthService, so an account
// that is registered *after* boot picks the role up on its first login.

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    const declared = this.config.get<string>('admin.usernames') ?? '';
    const usernames = declared
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);
    if (usernames.length === 0) return;

    const { count } = await this.prisma.user.updateMany({
      where: { username: { in: usernames, mode: 'insensitive' }, role: { not: 'ADMIN' } },
      data: { role: 'ADMIN' },
    });
    if (count > 0) this.logger.log(`promoted ${count} account(s) to ADMIN`);
  }
}
