// AdminGuard — every /admin/* route, on top of AccessTokenGuard.
//
// Role is read fresh from the row rather than trusted from the JWT: a token
// minted before a promotion (or a demotion) must not keep deciding access for
// its whole 15-minute life.

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.user) {
      // Access token guard should have run first; without a user there is
      // nothing to check a role against.
      throw new UnauthorizedException('Missing Bearer access token');
    }

    const account = await this.prisma.user.findUnique({
      where: { id: request.user.sub },
      select: { role: true },
    });
    if (!account || account.role !== 'ADMIN') {
      throw new ForbiddenException('Administrator access required');
    }
    return true;
  }
}
