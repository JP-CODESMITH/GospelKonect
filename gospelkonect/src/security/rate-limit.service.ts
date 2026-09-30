// RateLimitService — one Redis fixed-window counter for every write we throttle.
//
// Why fixed window: INCR + EXPIRE is two commands, needs no sorted set
// bookkeeping, and is exactly correct for "at most N per minute" style rules.
// Why fail-open: a Redis blip must degrade to "no limiting", never to "the
// whole API answers 503" — the login limiter is the only place a hard failure
// is acceptable, because there it protects credentials.

import { HttpException, Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service.js';

/** A rule as declared next to the route. */
export interface RateLimitRule {
  /** Short verb used in the key and the env override: `posts`, `reports`. */
  scope: string;
  /** Requests allowed inside one window. */
  points: number;
  /** Window length, in seconds. */
  windowSec: number;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Counts one request and throws 429 once the window is exceeded.
   *
   * Overrides are read from the environment on every call (not at boot), so a
   * test can tighten a limit with RATE_LIMIT_<SCOPE> before it exercises the
   * route, and an operator can retune without a restart. Setting the value to
   * 0 disables the rule entirely.
   */
  async consume(rule: RateLimitRule, identity: string): Promise<void> {
    const points = this.override(`RATE_LIMIT_${rule.scope.toUpperCase()}`, rule.points);
    const windowSec = this.override(
      `RATE_LIMIT_${rule.scope.toUpperCase()}_WINDOW`,
      rule.windowSec,
    );
    if (points <= 0 || windowSec <= 0) return; // explicitly switched off

    const key = `rl:${rule.scope}:${identity}`;
    let count = 0;
    try {
      count = await this.redis.getClient().incr(key);
      if (count === 1) {
        // Only the first hit sets the expiry: sliding it on every request
        // would let a steady stream keep the window open forever.
        await this.redis.expire(key, windowSec);
      }
    } catch (err) {
      this.logger.debug(`rate limit skipped (${rule.scope}): ${(err as Error).message}`);
      return; // fail open — availability over strictness
    }

    if (count > points) {
      // No remaining-attempts hint: the caller only needs to back off.
      throw new HttpException('Too many requests, please slow down', 429);
    }
  }

  /** Numeric env override, falling back to the coded default. */
  private override(name: string, fallback: number): number {
    const raw = process.env[name];
    if (raw === undefined) return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
}
