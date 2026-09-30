import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AccessTokenGuard } from './access-token.guard.js';
import { TokenService } from '../token/token.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

describe('AccessTokenGuard', () => {
  let guard: AccessTokenGuard;

  const tokenService = {
    verifyAccessToken: vi.fn(),
  };

  // Phase 9: the guard also reads the account row (suspension lives there,
  // not in the token), so the spec stubs exactly those two operations.
  const prisma = {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };

  // Builds the minimal ExecutionContext a guard actually touches: only
  // switchToHttp().getRequest() is used.
  const ctxWith = (headers: Record<string, string | undefined>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    vi.clearAllMocks();

    // Built directly rather than through Nest: the guard has exactly one
    // dependency, and DI adds nothing to what this test verifies.
    guard = new AccessTokenGuard(
      tokenService as unknown as TokenService,
      prisma as unknown as PrismaService,
    );
    // Default: the account exists and is in good standing.
    prisma.user.findUnique.mockResolvedValue({ status: 'ACTIVE', suspendedUntil: null });
    tokenService.verifyAccessToken.mockResolvedValue({
      sub: 'user_1',
      email: 'john@example.com',
      username: 'johndoe',
      jti: 'jti_1',
      type: 'access',
    });
  });

  it('rejects a request with no Authorization header', async () => {
    await expect(guard.canActivate(ctxWith({}))).rejects.toThrow(UnauthorizedException);
    expect(tokenService.verifyAccessToken).not.toHaveBeenCalled();
  });

  it('rejects a non-Bearer scheme', async () => {
    await expect(guard.canActivate(ctxWith({ authorization: 'Basic dXNlcjpwdw==' }))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(tokenService.verifyAccessToken).not.toHaveBeenCalled();
  });

  it('rejects "Bearer" with nothing after it', async () => {
    await expect(guard.canActivate(ctxWith({ authorization: 'Bearer   ' }))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(tokenService.verifyAccessToken).not.toHaveBeenCalled();
  });

  it('propagates token verification failures as 401', async () => {
    tokenService.verifyAccessToken.mockRejectedValue(new UnauthorizedException());

    await expect(
      guard.canActivate(ctxWith({ authorization: 'Bearer garbage.token.here' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('attaches the claims and the raw token to the request on success', async () => {
    const request: Record<string, unknown> = { headers: { authorization: 'Bearer abc.def.ghi' } };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(request.user).toMatchObject({ sub: 'user_1', jti: 'jti_1' });
    // The raw string is kept so logout can read its `exp` for the deny-list TTL.
    expect(request.accessToken).toBe('abc.def.ghi');
  });
});
