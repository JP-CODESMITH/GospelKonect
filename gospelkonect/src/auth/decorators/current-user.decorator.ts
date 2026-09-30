// Injects the identity set by AccessTokenGuard as a handler argument:
//   @Get('me') me(@CurrentUser() user: AccessTokenPayload) { ... }

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AccessTokenPayload } from '../token/token.service.js';

// Returns whatever AccessTokenGuard attached to the request; `undefined` just
// means the route wasn't protected, so there is no identity to inject.
const currentUserFactory = (
  _data: unknown,
  context: ExecutionContext,
): AccessTokenPayload => {
  const request = context.switchToHttp().getRequest();
  return request.user as AccessTokenPayload;
};

export const CurrentUser = createParamDecorator(currentUserFactory);
