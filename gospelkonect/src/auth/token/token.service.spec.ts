import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { TokenService } from './token.service.js';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service.js';

const USER = { id: 'user_1', email: 'john@example.com', username: 'johndoe' };

describe('TokenService', () => {
  let service: TokenService;

  // In-memory stand-in for Redis: only existence + TTL semantics matter here.
  const store = new Map<string, string>();
  const redis = {
    get: vi.fn(async (k: string) => store.get(k) ?? null),
    set: vi.fn(async (k: string, v: string) => {
      store.set(k, v);
      return 'OK';
    }),
    del: vi.fn(async (...keys: string[]) => {
      let n = 0;
      for (const k of keys) if (store.delete(k)) n++;
      return n;
    }),
    exists: vi.fn(async (k: string) => (store.has(k) ? 1 : 0)),
    expire: vi.fn(async () => 1),
    getClient: vi.fn(),
  };

  // Config values read through `get(key)` — mirrored from env.config.ts defaults.
  const config = {
    get: vi.fn((key: string) => {
      const map: Record<string, unknown> = {
        'auth.accessTtlSeconds': 900,
        'auth.refreshTtlSeconds': 604800,
      };
      return map[key];
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    store.clear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        // A real JwtService (not a mock) so signature/verification is exercised
        // for real; only the secret is supplied here.
        { provide: JwtService, useValue: new JwtService({ secret: 'test-secret' }) },
        { provide: ConfigService, useValue: config },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });

  it('round-trips an access token back to its claims', async () => {
    const token = await service.signAccessToken(USER);
    const claims = await service.verifyAccessToken(token);

    expect(claims.sub).toBe(USER.id);
    expect(claims.email).toBe(USER.email);
    expect(claims.type).toBe('access');
    expect(claims.jti).toBeTruthy();
  });

  it('rejects an access token signed with a different secret', async () => {
    const other = new (await import('@nestjs/jwt')).JwtService({ secret: 'wrong-secret' });
    const forged = await other.signAsync({ sub: USER.id, jti: 'x', type: 'access' });

    await expect(service.verifyAccessToken(forged)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a refresh token presented as an access token', async () => {
    const { token } = await service.signRefreshToken(USER.id);

    await expect(service.verifyAccessToken(token)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an access token immediately after it is deny-listed', async () => {
    const token = await service.signAccessToken(USER);
    const { jti } = await service.verifyAccessToken(token);

    await service.denyAccessToken(USER.id, jti, token);

    await expect(service.verifyAccessToken(token)).rejects.toThrow(UnauthorizedException);
    // The deny entry must expire with the token, or Redis would grow forever.
    expect(redis.set).toHaveBeenCalled();
  });

  it('round-trips a refresh token while its Redis record exists', async () => {
    const { token, jti } = await service.signRefreshToken(USER.id);

    expect(await service.isRefreshTokenValid(USER.id, jti)).toBe(true);

    const claims = await service.verifyRefreshToken(token);
    expect(claims.sub).toBe(USER.id);
    expect(claims.jti).toBe(jti);
  });

  it('rejects a refresh token once its session is revoked', async () => {
    const { token, jti } = await service.signRefreshToken(USER.id);
    await service.revokeRefreshToken(USER.id, jti);

    await expect(service.verifyRefreshToken(token)).rejects.toThrow(UnauthorizedException);
  });

  it('revokes every session for a user but leaves other users alone', async () => {
    const a1 = await service.signRefreshToken(USER.id);
    const a2 = await service.signRefreshToken(USER.id);
    const b1 = await service.signRefreshToken('user_2');

    // getClient() backs the SCAN loop used by revokeAllRefreshTokens.
    redis.getClient.mockReturnValue({
      scan: vi.fn(async () => {
        const keys = [...store.keys()].filter((k) => k.startsWith(`auth:refresh:${USER.id}:`));
        return ['0', keys]; // Single-page SCAN: cursor "0" means finished.
      }),
      del: vi.fn(async (...keys: string[]) => {
        keys.forEach((k) => store.delete(k));
        return keys.length;
      }),
    });

    await service.revokeAllRefreshTokens(USER.id);

    expect(await service.isRefreshTokenValid(USER.id, a1.jti)).toBe(false);
    expect(await service.isRefreshTokenValid(USER.id, a2.jti)).toBe(false);
    expect(await service.isRefreshTokenValid('user_2', b1.jti)).toBe(true);
  });

  it('reads the jti out of a refresh token without verifying it', async () => {
    const { token, jti } = await service.signRefreshToken(USER.id);

    expect(service.decodeRefreshJti(token)).toBe(jti);
    // An access token must not yield a jti through this path.
    expect(service.decodeRefreshJti(await service.signAccessToken(USER))).toBeUndefined();
  });
});
