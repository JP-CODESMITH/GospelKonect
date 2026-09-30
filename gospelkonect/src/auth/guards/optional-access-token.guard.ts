// OptionalAccessTokenGuard — for endpoints that are PUBLIC but personalise their
// response when the caller happens to be signed in (e.g. GET /users/:username
// adding `isFollowing: true`).
//
// It runs the exact same checks as AccessTokenGuard, so a valid token still
// attaches `req.user`; an absent or invalid one is treated as anonymous rather
// than rejected.

import { ExecutionContext, Injectable } from '@nestjs/common';
import { AccessTokenGuard } from './access-token.guard.js';

@Injectable()
export class OptionalAccessTokenGuard extends AccessTokenGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return await super.canActivate(context);
    } catch {
      // Anonymous. Returning true (rather than false) is required: false would
      // make Nest answer 403 and block the public route entirely.
      return true;
    }
  }
}
