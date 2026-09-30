// Gate in front of every protected route: finds the Bearer header, verifies the
// JWT, rejects it if logout deny-listed it, then attaches `req.user` for
// @CurrentUser(). Throws instead of returning false so Nest replies with a 401
// body rather than the bare 403 that a `false` return produces.

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { TokenService } from '../token/token.service.js';

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
  constructor(private readonly tokenService: TokenService) {}

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
    return true;
  }
}
