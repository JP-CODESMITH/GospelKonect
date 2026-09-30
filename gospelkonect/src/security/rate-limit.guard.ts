// RateLimitGuard — applies a @RateLimit(rule) budget to one route.
//
// The identity is the signed-in user when a token guard ran first (so one
// account cannot exhaust another's budget) and the client IP otherwise.
// Order matters: @UseGuards(AccessTokenGuard, RateLimitGuard).

import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { RateLimitService, type RateLimitRule } from './rate-limit.service.js';

export const RATE_LIMIT_METADATA = 'rateLimit';

/**
 * Declares the budget for a route. Reads as a sentence above the handler:
 * rate-limited to 30 reports per hour for this account.
 */
export const RateLimit = (rule: RateLimitRule): MethodDecorator & ClassDecorator =>
  SetMetadata(RATE_LIMIT_METADATA, rule);

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimit: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rule = this.reflector.getAllAndOverride<RateLimitRule | undefined>(
      RATE_LIMIT_METADATA,
      [context.getHandler(), context.getClass()],
    );
    // No annotation on this route → it is not throttled at all.
    if (!rule) return true;

    const request = context.switchToHttp().getRequest<Request>();
    // `user` is only there when a token guard ran before this one (see the
    // order note above); otherwise every anonymous caller shares the IP key,
    // which is exactly what we want for registration.
    const identity = request.user?.sub ?? request.ip ?? 'anonymous';
    await this.rateLimit.consume(rule, identity);
    return true;
  }
}
