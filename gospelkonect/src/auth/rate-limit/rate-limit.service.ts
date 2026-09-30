// LoginRateLimitService — Redis fixed-window counter for failed logins.
//
// Keyed by email+IP so one attacker can't lock out every account, and a single
// account can't be brute-forced from one host. The counter is cleared on a
// successful login, so only failures accumulate.

import { HttpException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service.js';

const PREFIX = 'auth:rl'; // auth:rl:<email>:<ip> -> number of recent failures

@Injectable()
export class LoginRateLimitService {
  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Records one failed attempt and throws 429 once the window is exceeded.
   * Called by LoginRateLimitGuard before credentials are checked, so a brute
   * force never reaches Postgres or argon2.
   */
  async fail(email: string, ip: string): Promise<void> {
    const key = this.key(email, ip);
    // ?? 900 mirrors the default window in env.config.ts.
    const ttl = this.config.get<number>('auth.loginWindowSeconds') ?? 900;

    // INCR creates the key at 1 on first use; returns how many failures so far.
    const count = await this.redis.getClient().incr(key);

    if (count === 1) {
      // Only the first hit sets the expiry — sliding it on every attempt would
      // let a steady attacker keep the window open forever.
      await this.redis.expire(key, ttl);
    }

    // ?? 5 mirrors the default in env.config.ts so a missing key still limits.
    const max = this.config.get<number>('auth.loginMaxAttempts') ?? 5;
    if (count > max) {
      // Deliberately generic: no remaining-attempts hint for the attacker.
      // Nest has no dedicated 429 exception class, so HttpException carries
      // the status explicitly.
      throw new HttpException(
        'Too many failed login attempts, please try again later',
        429,
      );
    }
  }

  /** Clears the counter after a successful login so valid users aren't throttled. */
  async clear(email: string, ip: string): Promise<void> {
    await this.redis.del(this.key(email, ip));
  }

  // Scoped by IP as well as email so a shared account can't be used to lock
  // out other users from a different address.
  private key(email: string, ip: string): string {
    return `${PREFIX}:${email}:${ip}`;
  }
}
