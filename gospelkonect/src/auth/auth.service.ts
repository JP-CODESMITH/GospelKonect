// auth.service.ts
import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
// Generated model type, so SafeUser stays in sync with the schema automatically.
import type { User } from '@prisma/client';
import { HashingService } from './hash/hash.service.js';
import { TokenService } from './token/token.service.js';
import { LoginRateLimitService } from './rate-limit/rate-limit.service.js';

/** What every credential exchange hands back to the client. */
export interface AuthSession {
  accessToken: string; // 15m, sent as `Authorization: Bearer <t>`
  refreshToken: string; // 7d, sent back only in body of /auth/refresh and /auth/logout
  user: SafeUser; // Never includes passwordHash
}

/** A Prisma User with the credential column removed. */
type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class AuthService {
  // NOTE (fix): PrismaService is injected via the constructor (Nest DI) instead of
  // `require()` + `new` per request. Reason: this project is ESM ("type": "module"),
  // so `require()` throws at runtime, and a new client per request leaks DB
  // connections. The injected instance is created once by Nest and shared.
  constructor(
    private readonly hashingService: HashingService,
    private readonly prisma: PrismaService,
    // Issues/verifies/revokes JWTs and maintains their Redis records.
    private readonly tokenService: TokenService,
    // Clears the failed-login counter after a good password check.
    private readonly rateLimit: LoginRateLimitService,
    // ADMIN_USERNAMES: who is provisioned as an administrator at login.
    private readonly config: ConfigService,
  ) {}

  /**
   * Creates an account. Returns the new user without any token — the client is
   * expected to call /auth/login next, matching the Register → Login flow.
   */
  async registerUser(password: string, username: string, email: string): Promise<SafeUser> {
    // NOTE (fix): basic length guard kept here so the service is safe even when
    // called directly (e.g. in tests) with the global ValidationPipe bypassed.
    // Detailed format rules (valid email, etc.) live on the DTO via class-validator.
    if (
      password.length < 8 ||
      password.length > 128 ||
      username.length < 3 ||
      username.length > 50 ||
      email.length < 5 ||
      email.length > 100
    ) {
      throw new BadRequestException(
        'Input does not meet the required criteria',
      );
    }

    // NOTE (fix): check the unique fields first so we return 409 Conflict with a
    // clear message instead of leaking a raw Prisma P2002 error.
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      throw new ConflictException('Email or username already in use');
    }

    const passwordHash = await this.hashingService.hashPassword(password);

    // NOTE (fix): the old code wrote `{ name, email, password }`, which never worked:
    //  - `password` is not a column (the schema uses `passwordHash`),
    //  - `username` (required + unique in the schema) was never set,
    //  - `$connect()` resolves to void, so `db.user.create` crashed.
    // Corrected below to write the real columns, awaited directly on the injected
    // client. `name` is required by the schema but the register DTO only carries
    // `username`, so `name` defaults to `username` for now. If a separate display
    // name is added to the DTO later, pass it here instead of `username`.
    const user = await this.prisma.user.create({
      data: {
        name: username,
        username,
        email,
        passwordHash,
      },
    });

    // NOTE (fix): never return the password hash to callers. It is stripped here
    // so the controller response cannot leak credentials.
    const { passwordHash: _omitted, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Verifies credentials and mints a token pair. Throws 401 on bad credentials
   * and 429 once the rate limit trips; on success it resets that limit.
   */
  async login(
    password: string,
    email: string,
    ip: string,
  ): Promise<AuthSession> {
    // NOTE (fix): look up by unique email only. The previous version passed
    // `{ email, passwordHash }` to findUnique, which Prisma rejects because that
    // combination is not a defined unique constraint.
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // NOTE (fix): explicit not-found guard. Previously this relied on a TypeError
    // (`null.passwordHash`) falling into the catch below, which worked by accident
    // and was hard to read. Same 401 message either way so callers cannot tell
    // "unknown email" apart from "wrong password" (no user enumeration).
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // NOTE (fix): verify with argon2.verify via comparePassword. Re-hashing the
    // input and comparing strings can never match (fresh random salt per hash).
    // comparePassword already returns false on internal verify errors, so no
    // try/catch is needed here.
    // NOTE (fix): no broad try/catch around this method anymore. Catching every
    // error as 401 masked real failures (DB down, timeouts) as "wrong password".
    // Unexpected errors now propagate as 500s so outages are visible.
    const isPasswordValid = await this.hashingService.comparePassword(
      password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Correct password: forget the recent failures so a mistyped password a
    // moment ago doesn't count against this user.
    await this.rateLimit.clear(email, ip);

    await this.applyAccountPolicy(user);

    return this.issueSession(user);
  }

  /**
   * Phase 9, checked at login (the guard covers calls made WITH a token; this
   * stops a suspended account from being issued a fresh one at all):
   *  - accounts listed in ADMIN_USERNAMES are (re)promoted to ADMIN, which is
   *    how the first moderator of an environment is provisioned;
   *  - a suspension refuses the login with 403 and its expiry, and an
   *    expired suspension lifts itself here.
   */
  private async applyAccountPolicy(user: User): Promise<void> {
    const declared = this.config.get<string>('admin.usernames') ?? '';
    const wanted = declared
      .split(',')
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean);

    if (wanted.includes(user.username.toLowerCase()) && user.role !== 'ADMIN') {
      await this.prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
      user.role = 'ADMIN';
    }

    if (user.status !== 'SUSPENDED') return;
    const until = user.suspendedUntil;
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
    await this.prisma.user.update({
      where: { id: user.id },
      data: { status: 'ACTIVE', suspendedUntil: null, suspendedReason: null },
    });
    user.status = 'ACTIVE';
    user.suspendedUntil = null;
    user.suspendedReason = null;
  }

  /**
   * Exchanges a valid refresh token for a brand-new pair, revoking the old one
   * first (rotation) so a stolen refresh token can only be used once.
   */
  async refresh(userId: string, currentRefreshJti: string): Promise<AuthSession> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      // Token was valid but the account was deleted since — treat as logged out.
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Revoke before issuing: if signing fails, the user is logged out rather
    // than left holding two live tokens.
    await this.tokenService.revokeRefreshToken(userId, currentRefreshJti);

    return this.issueSession(user);
  }

  /**
   * Logs one session out: revokes its refresh token (or all of them when the
   * client doesn't say which) and deny-lists the presented access token so it
   * dies now instead of at its 15m expiry.
   */
  async logout(
    userId: string,
    rawAccessToken: string,
    accessJti: string,
    refreshTokenRaw?: string,
  ): Promise<void> {
    // Narrow to the single session when the client supplied a refresh token;
    // otherwise fall back to closing everything rather than leaving a live
    // refresh token behind.
    const refreshJti = refreshTokenRaw
      ? this.tokenService.decodeRefreshJti(refreshTokenRaw)
      : undefined;

    if (refreshJti) {
      await this.tokenService.revokeRefreshToken(userId, refreshJti);
    } else {
      await this.tokenService.revokeAllRefreshTokens(userId);
    }
    await this.denyAccessToken(userId, rawAccessToken, accessJti);
  }

  /** Logs the user out of every device: all refresh sessions plus this one. */
  async logoutAll(userId: string, rawAccessToken: string, accessJti: string): Promise<void> {
    await this.tokenService.revokeAllRefreshTokens(userId);
    await this.denyAccessToken(userId, rawAccessToken, accessJti);
  }

  /** Loads the caller's own record, for GET /auth/me. */
  async me(userId: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      // Token is valid but the account no longer exists.
      throw new NotFoundException('User not found');
    }
    const { passwordHash: _omitted, ...safeUser } = user;
    return safeUser;
  }

  // --- private helpers -------------------------------------------------------

  /** Mints both tokens for an authenticated user and strips the hash. */
  private async issueSession(user: User): Promise<AuthSession> {
    const [accessToken, refresh] = await Promise.all([
      this.tokenService.signAccessToken(user),
      this.tokenService.signRefreshToken(user.id),
    ]);

    const { passwordHash: _omitted, ...safeUser } = user;
    return { accessToken, refreshToken: refresh.token, user: safeUser };
  }

  /** Records the access token as revoked for the remainder of its lifetime. */
  private async denyAccessToken(
    userId: string,
    rawAccessToken: string,
    accessJti: string,
  ): Promise<void> {
    await this.tokenService.denyAccessToken(userId, accessJti, rawAccessToken);
  }
}
