// Validates the refresh token sent in the body of POST /auth/refresh and
// POST /auth/logout, and exposes it to the handler. A refresh token lives in
// the body rather than a header because it is a request credential (like a
// password), not a per-request identity — it should never be logged in
// access-log headers.

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { TokenService } from '../token/token.service.js';

export interface VerifiedRefreshToken {
  claims: import('../token/token.service.js').RefreshTokenPayload;
  raw: string; // Kept so the handler can revoke this exact session by jti.
}

declare module 'express' {
  interface Request {
    refreshToken?: VerifiedRefreshToken;
  }
}

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const raw = String(request.body?.refreshToken ?? '').trim();

    if (!raw) {
      throw new UnauthorizedException('Missing refreshToken in request body');
    }

    // Checks signature, expiry, type and the Redis session record.
    const claims = await this.tokenService.verifyRefreshToken(raw);
    request.refreshToken = { claims, raw };
    return true;
  }
}
