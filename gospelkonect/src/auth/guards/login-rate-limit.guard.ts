// Records a failed login attempt (and 429s when the window is exceeded) before
// any credential check runs, so brute forcing never reaches Postgres or argon2.

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { LoginRateLimitService } from '../rate-limit/rate-limit.service.js';

@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  constructor(private readonly rateLimit: LoginRateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Body is already parsed by Express at this point (pipes run after guards),
    // so we can read the raw email. It is unvalidated here — that's fine, a
    // garbage email simply produces a garbage (and harmless) Redis key.
    const email = String(request.body?.email ?? 'unknown').toLowerCase();
    const ip = request.ip ?? request.socket.remoteAddress ?? 'unknown';

    // Throws 429 when too many failures have accumulated for this pair.
    await this.rateLimit.fail(email, ip);
    return true;
  }
}
