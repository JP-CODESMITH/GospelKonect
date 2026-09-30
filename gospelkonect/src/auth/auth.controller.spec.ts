import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { TokenService } from './token/token.service.js';
import { LoginRateLimitService } from './rate-limit/rate-limit.service.js';
import { RateLimitService } from '../security/rate-limit.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AccessTokenPayload } from './token/token.service.js';

const USER_CLAIMS: AccessTokenPayload = {
  sub: 'user_1',
  email: 'john@example.com',
  username: 'johndoe',
  jti: 'jti_1',
  type: 'access',
};

describe('AuthController', () => {
  let controller: AuthController;

  const authService = {
    registerUser: vi.fn(),
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    me: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      // AuthService is the controller's only constructor dependency; the other
      // two are needed because @UseGuards() makes Nest instantiate the guards
      // (and therefore their dependencies) when the module loads.
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: TokenService, useValue: {} },
        { provide: LoginRateLimitService, useValue: {} },
        // The register route's @RateLimit guard is instantiated with the
        // controller; its dependency only has to resolve, never be called
        // here (these tests invoke methods, not the HTTP pipeline).
        { provide: RateLimitService, useValue: { consume: vi.fn() } },
        // The logout routes' AccessTokenGuard reads the account row for
        // suspensions; these tests never reach that code path, they only need
        // the dependency to resolve.
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique: vi.fn(async () => ({ status: 'ACTIVE', suspendedUntil: null })) },
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes the request IP to the login flow so rate limiting can key on it', async () => {
    const req = { ip: '203.0.113.7' } as Request;
    authService.login.mockResolvedValue({ accessToken: 'a', refreshToken: 'r', user: {} });

    await controller.login({ email: 'john@example.com', password: 'password123' }, req);

    expect(authService.login).toHaveBeenCalledWith(
      'password123',
      'john@example.com',
      '203.0.113.7',
    );
  });

  it('passes the verified refresh token claims to the refresh flow', async () => {
    const req = {
      refreshToken: { claims: { sub: 'user_1', jti: 'old_jti', type: 'refresh' }, raw: 'x.y.z' },
    } as unknown as Request;
    authService.refresh.mockResolvedValue({ accessToken: 'a', refreshToken: 'r', user: {} });

    await controller.refresh(req);

    expect(authService.refresh).toHaveBeenCalledWith('user_1', 'old_jti');
  });

  it('hands the body refresh token to logout so only that session closes', async () => {
    const req = { accessToken: 'raw.access.token' } as Request;

    await controller.logout(req, USER_CLAIMS, { refreshToken: 'raw.refresh.token' });

    expect(authService.logout).toHaveBeenCalledWith(
      'user_1',
      'raw.access.token',
      'jti_1',
      'raw.refresh.token',
    );
  });

  it('logs out of every device using the guard-supplied identity', async () => {
    const req = { accessToken: 'raw.access.token' } as Request;

    await controller.logoutAll(req, USER_CLAIMS);

    expect(authService.logoutAll).toHaveBeenCalledWith('user_1', 'raw.access.token', 'jti_1');
  });

  it('resolves /me from the authenticated identity, not from user input', async () => {
    authService.me.mockResolvedValue({ id: 'user_1', username: 'johndoe' });

    const result = await controller.me(USER_CLAIMS);

    expect(authService.me).toHaveBeenCalledWith('user_1');
    expect(result).toEqual({ id: 'user_1', username: 'johndoe' });
  });

  it('forwards registration fields in the expected order', async () => {
    authService.registerUser.mockResolvedValue({ id: 'user_1' });

    await controller.registerUser({
      username: 'johndoe',
      email: 'john@example.com',
      password: 'password123',
    });

    expect(authService.registerUser).toHaveBeenCalledWith('password123', 'johndoe', 'john@example.com');
  });
});
