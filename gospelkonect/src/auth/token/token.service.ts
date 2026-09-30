// TokenService — the only place allowed to issue, verify or revoke JWTs.
//
// Access tokens:  short lived (15m), sent as `Authorization: Bearer <t>`.
// Refresh tokens: long lived (7d), also registered in Redis so logout can kill
//                 them before they expire — that record is what makes logout real.

import { randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service.js';

/** Claims carried by an access token. `jti` is the handle used to revoke it. */
export interface AccessTokenPayload {
  sub: string; // User.id
  email: string; // Denormalised so guards don't need a DB lookup.
  username: string;
  jti: string;
  type: 'access'; // Stops a refresh token being replayed as an access token.
}

/** Claims carried by a refresh token. Deliberately minimal. */
export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: 'refresh';
}

// Key layouts:  auth:refresh:<userId>:<jti>  session record, TTL = refresh life
//               auth:deny:<userId>:<jti>     logout deny-list, TTL = access life
const REFRESH_PREFIX = 'auth:refresh';
const DENY_PREFIX = 'auth:deny';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Signs an access token. Writes nothing to Redis — access tokens are
   * stateless while valid and only get recorded if they are later denied.
   */
  async signAccessToken(user: { id: string; email: string; username: string }): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      jti: randomUUID(), // Fresh id per issue so two tokens are distinguishable.
      type: 'access',
    };
    // Seconds (a number) rather than a duration string: ms-style strings are
    // a branded type in jwt's typings, numbers need no cast.
    return this.jwtService.signAsync(payload, {
      expiresIn: this.config.get<number>('auth.accessTtlSeconds') ?? 900,
    });
  }

  /**
   * Signs a refresh token AND registers it in Redis. The JWT would stay valid
   * for 7 days regardless; deleting that Redis key (logout / rotation) is what
   * actually invalidates it.
   */
  async signRefreshToken(userId: string): Promise<{ token: string; jti: string }> {
    const jti = randomUUID();
    const payload: RefreshTokenPayload = { sub: userId, jti, type: 'refresh' };
    const ttl = this.config.get<number>('auth.refreshTtlSeconds');

    // Sign before writing so a signing failure leaves no orphan key.
    const token = await this.jwtService.signAsync(payload, { expiresIn: ttl });

    // Value is just "1": only existence matters, the real data is in the JWT.
    await this.redis.set(this.refreshKey(userId, jti), '1', ttl);
    return { token, jti };
  }

  /**
   * Verifies an access token and returns its claims, or throws 401.
   * Throwing (rather than returning null) lets guards simply await it and lets
   * Nest turn the exception into a 401 response.
   */
  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    let claims: AccessTokenPayload;
    try {
      claims = await this.jwtService.verifyAsync<AccessTokenPayload>(token);
    } catch {
      // Collapses "expired" and "malformed" into one message so callers can't
      // tell them apart.
      throw new UnauthorizedException('Invalid or expired access token');
    }

    if (claims.type !== 'access') {
      throw new UnauthorizedException('Invalid access token type');
    }

    // Signature is good; now check whether logout revoked it mid-lifetime.
    if (await this.isAccessDenied(claims.sub, claims.jti)) {
      throw new UnauthorizedException('Token has been revoked');
    }
    return claims;
  }

  /** Verifies a refresh token's signature, type and Redis record, or throws 401. */
  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    let claims: RefreshTokenPayload;
    try {
      claims = await this.jwtService.verifyAsync<RefreshTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (claims.type !== 'refresh') {
      // An access token replayed against /auth/refresh must be rejected.
      throw new UnauthorizedException('Invalid refresh token type');
    }

    // Signature proves we issued it; only Redis says whether it was logged out
    // or already rotated away.
    if (!(await this.isRefreshTokenValid(claims.sub, claims.jti))) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }
    return claims;
  }

  /** True while this refresh token is still registered in Redis. */
  async isRefreshTokenValid(userId: string, jti: string): Promise<boolean> {
    return (await this.redis.exists(this.refreshKey(userId, jti))) === 1;
  }

  /** Revokes one refresh token — used on logout and on every rotation. */
  async revokeRefreshToken(userId: string, jti: string): Promise<void> {
    await this.redis.del(this.refreshKey(userId, jti));
  }

  /**
   * Revokes every refresh token for a user ("log out everywhere"). Uses SCAN
   * rather than KEYS because KEYS blocks the Redis event loop for O(all keys).
   */
  async revokeAllRefreshTokens(userId: string): Promise<void> {
    const client = this.redis.getClient();
    const pattern = `${REFRESH_PREFIX}:${userId}:*`;
    let cursor = '0'; // SCAN starts at "0" and returns "0" when finished.

    do {
      const [next, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = next;
      if (keys.length > 0) await client.del(...keys);
    } while (cursor !== '0');
  }

  /**
   * Denies a still-valid access token so logout takes effect immediately.
   * TTL is taken from the token's own `exp`, so the entry disappears exactly
   * when the token would have expired anyway.
   */
  async denyAccessToken(userId: string, jti: string, rawToken: string): Promise<void> {
    // Decode without verifying: the signature was already checked by the guard
    // before logout was allowed to run.
    const decoded = this.jwtService.decode<{ exp?: number }>(rawToken);
    const nowSeconds = Math.floor(Date.now() / 1000);

    // Degrade to the full window if `exp` is missing, rather than denying forever.
    const ttl = decoded?.exp && decoded.exp > nowSeconds ? decoded.exp - nowSeconds : 900;

    await this.redis.set(this.denyKey(userId, jti), '1', ttl);
  }

  /** True when this access token was revoked by logout. */
  async isAccessDenied(userId: string, jti: string): Promise<boolean> {
    return (await this.redis.exists(this.denyKey(userId, jti))) === 1;
  }

  /**
   * Reads the `jti` out of a refresh token WITHOUT verifying it, so logout can
   * revoke just the session being closed. This is safe because the key it
   * builds is namespaced under the authenticated user's own id — a forged jti
   * can only ever point at a key that user could already delete.
   */
  decodeRefreshJti(raw: string): string | undefined {
    const decoded = this.jwtService.decode<RefreshTokenPayload>(raw);
    return decoded?.type === 'refresh' ? decoded.jti : undefined;
  }

  // Key builders kept in one place: a typo in a scattered raw string would
  // silently create a second, unread key.
  private refreshKey(userId: string, jti: string): string {
    return `${REFRESH_PREFIX}:${userId}:${jti}`;
  }

  private denyKey(userId: string, jti: string): string {
    return `${DENY_PREFIX}:${userId}:${jti}`;
  }
}
