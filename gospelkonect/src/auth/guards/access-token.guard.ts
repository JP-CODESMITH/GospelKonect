// Gate in front of every protected route: finds the Bearer header, verifies the
// JWT, rejects it if logout deny-listed it, then attaches `req.user` for
// @CurrentUser(). Throws instead of returning false so Nest replies with a 401
// body rather than the bare 403 that a `false` return produces.

import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { TokenService } from '../token/token.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

// Express's Request has no `user` field until a guard sets it; declaration
// merging gives it a type instead of forcing casts everywhere.
declare module 'express' {
  interface Request {
    user?: import('../token/token.service.js').AccessTokenPayload;
    // Raw token string, kept so logout can read its `exp` for the deny-list TTL.
    accessToken?: string;
  }
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    // Phase 9: a signature alone no longer proves the account may act — the
    // row carries the suspension, so it is checked on every guarded call.
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers.authorization;

    // Reject anything that isn't literally `Bearer <token>` with a message that
    // says what's missing, rather than a generic JWT parse error.
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Bearer access token');
    }

    const token = authorization.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Missing Bearer access token');
    }

    // Verify signature/expiry/type and check the logout deny-list.
    request.user = await this.tokenService.verifyAccessToken(token);
    // Keep the raw string too — denyAccessToken() needs its `exp` claim.
    request.accessToken = token;
    await this.assertAccountActive(request.user.sub);
    return true;
  }

  /**
   * Refuses a suspended account with 403 (and its reason/until, so a client
   * can say why), and quietly reactivates one whose time has run out. Optional
   * reads keep working: OptionalAccessTokenGuard catches this and treats the
   * caller as anonymous instead of failing the public route.
   */
  private async assertAccountActive(userId: string): Promise<void> {
    const account = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status: true, suspendedUntil: true },
    });
    // Deleted account, or a token that outlived its user: 401, not 403 — the
    // token itself is no longer backed by anything.
    if (!account) throw new UnauthorizedException('Account no longer exists');
    if (account.status !== 'SUSPENDED') return;

    const until = account.suspendedUntil;
    if (!until || until.getTime() > Date.now()) {
      throw new HttpException(
        {
          message: 'This account is suspended',
          code: 'ACCOUNT_SUSPENDED',
          suspendedUntil: until,
        },
        403,
      );
    }

    // The suspension has expired: lift it so login and API calls work again
    // without an administrator having to remember to click "unsuspend".
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE', suspendedUntil: null, suspendedReason: null },
    });
  }
}
