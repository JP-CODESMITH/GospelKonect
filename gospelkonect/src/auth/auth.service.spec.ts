import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { HashingService } from './hash/hash.service.js';
import { TokenService } from './token/token.service.js';
import { LoginRateLimitService } from './rate-limit/rate-limit.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

// A full Prisma User row as `create` would return it — passwordHash included,
// because stripping it is exactly what the service is responsible for.
const dbUser = {
  id: 'user_1',
  name: 'johndoe',
  username: 'johndoe',
  email: 'john@example.com',
  passwordHash: '$argon2id$v=19$m=65536$fake',
  avatar: null,
  bio: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

// Vitest globals are enabled in vitest.config.ts (describe/it/expect/vi).

describe('AuthService', () => {
  let service: AuthService;

  // Spies recorded per-test so assertions can inspect what was called.
  const prisma = {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  };
  const hashing = {
    hashPassword: vi.fn(),
    comparePassword: vi.fn(),
  };
  const tokens = {
    signAccessToken: vi.fn(),
    signRefreshToken: vi.fn(),
    revokeRefreshToken: vi.fn(),
    revokeAllRefreshTokens: vi.fn(),
    denyAccessToken: vi.fn(),
    decodeRefreshJti: vi.fn(),
  };
  const rateLimit = {
    clear: vi.fn(),
  };

  beforeEach(async () => {
    // Reset every mock so one test's stubs can't leak into the next.
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: HashingService, useValue: hashing },
        { provide: PrismaService, useValue: prisma },
        { provide: TokenService, useValue: tokens },
        { provide: LoginRateLimitService, useValue: rateLimit },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Sensible defaults; individual tests override what they care about.
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue(dbUser);
    hashing.hashPassword.mockResolvedValue('hashed-password');
    hashing.comparePassword.mockResolvedValue(true);
    tokens.signAccessToken.mockResolvedValue('access.jwt');
    tokens.signRefreshToken.mockResolvedValue({ token: 'refresh.jwt', jti: 'jti_1' });
    tokens.decodeRefreshJti.mockReturnValue('jti_1');
  });

  // --- registerUser ---------------------------------------------------------

  it('creates an account and never returns the password hash', async () => {
    const result = await service.registerUser('password123', 'johndoe', 'john@example.com');

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        name: 'johndoe', // Schema requires `name`; DTO has no display name yet.
        username: 'johndoe',
        email: 'john@example.com',
        passwordHash: 'hashed-password',
      },
    });
    expect(result).not.toHaveProperty('passwordHash');
    expect(result.email).toBe('john@example.com');
  });

  it('rejects a password shorter than 8 characters before touching the database', async () => {
    await expect(service.registerUser('short', 'johndoe', 'john@example.com')).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('reports an existing email or username as a conflict', async () => {
    prisma.user.findFirst.mockResolvedValue(dbUser);

    await expect(
      service.registerUser('password123', 'johndoe', 'john@example.com'),
    ).rejects.toThrow(ConflictException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  // --- login ----------------------------------------------------------------

  it('returns a token pair and clears the rate limit on a valid password', async () => {
    prisma.user.findUnique.mockResolvedValue(dbUser);

    const result = await service.login('password123', 'john@example.com', '127.0.0.1');

    expect(result).toEqual({
      accessToken: 'access.jwt',
      refreshToken: 'refresh.jwt',
      user: expect.not.objectContaining({ passwordHash: expect.anything() }),
    });
    expect(rateLimit.clear).toHaveBeenCalledWith('john@example.com', '127.0.0.1');
  });

  it('rejects an unknown email with 401 and does not reveal it', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.login('password123', 'nobody@example.com', '127.0.0.1')).rejects.toThrow(
      UnauthorizedException,
    );
    // A failed attempt must NOT reset the counter, or brute force would be free.
    expect(rateLimit.clear).not.toHaveBeenCalled();
  });

  it('rejects a wrong password with the same message as an unknown email', async () => {
    prisma.user.findUnique.mockResolvedValue(dbUser);
    hashing.comparePassword.mockResolvedValue(false);

    await expect(service.login('wrong-password', 'john@example.com', '127.0.0.1')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(rateLimit.clear).not.toHaveBeenCalled();
  });

  // --- refresh --------------------------------------------------------------

  it('rotates a refresh token: revokes the old one before issuing a new pair', async () => {
    prisma.user.findUnique.mockResolvedValue(dbUser);

    const result = await service.refresh('user_1', 'old_jti');

    expect(tokens.revokeRefreshToken).toHaveBeenCalledWith('user_1', 'old_jti');
    expect(result.refreshToken).toBe('refresh.jwt');
  });

  it('refuses to refresh for a deleted account', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.refresh('user_1', 'old_jti')).rejects.toThrow(UnauthorizedException);
    expect(tokens.signRefreshToken).not.toHaveBeenCalled();
  });

  // --- logout ---------------------------------------------------------------

  it('revokes only the named session when a refresh token is supplied', async () => {
    await service.logout('user_1', 'access.jwt', 'access_jti', 'refresh.raw');

    expect(tokens.decodeRefreshJti).toHaveBeenCalledWith('refresh.raw');
    expect(tokens.revokeRefreshToken).toHaveBeenCalledWith('user_1', 'jti_1');
    expect(tokens.revokeAllRefreshTokens).not.toHaveBeenCalled();
    expect(tokens.denyAccessToken).toHaveBeenCalledWith('user_1', 'access_jti', 'access.jwt');
  });

  it('falls back to revoking every session when no refresh token is sent', async () => {
    await service.logout('user_1', 'access.jwt', 'access_jti');

    expect(tokens.revokeAllRefreshTokens).toHaveBeenCalledWith('user_1');
    expect(tokens.denyAccessToken).toHaveBeenCalledWith('user_1', 'access_jti', 'access.jwt');
  });

  it('logs out of every device', async () => {
    await service.logoutAll('user_1', 'access.jwt', 'access_jti');

    expect(tokens.revokeAllRefreshTokens).toHaveBeenCalledWith('user_1');
    expect(tokens.denyAccessToken).toHaveBeenCalledWith('user_1', 'access_jti', 'access.jwt');
  });

  // --- me -------------------------------------------------------------------

  it('returns the caller without their password hash', async () => {
    prisma.user.findUnique.mockResolvedValue(dbUser);

    const result = await service.me('user_1');

    expect(result).not.toHaveProperty('passwordHash');
    expect(result.username).toBe('johndoe');
  });

  it('reports a token whose account no longer exists as not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.me('user_1')).rejects.toThrow(NotFoundException);
  });
});
