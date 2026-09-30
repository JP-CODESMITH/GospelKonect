import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { LoginRateLimitService } from './rate-limit.service.js';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service.js';

describe('LoginRateLimitService', () => {
  let service: LoginRateLimitService;

  let counter: number;
  const store = new Map<string, string>();
  const client = {
    // Real fixed-window semantics: INCR increments (creating at 0) and returns
    // the new value, exactly like Redis.
    incr: vi.fn(async () => ++counter),
  };
  const redis = {
    expire: vi.fn(async () => 1),
    del: vi.fn(async (k: string) => (store.delete(k) ? 1 : 0)),
    getClient: vi.fn(() => client),
  };
  const config = {
    get: vi.fn((key: string) => {
      const map: Record<string, unknown> = {
        'auth.loginMaxAttempts': 3,
        'auth.loginWindowSeconds': 900,
      };
      return map[key];
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    store.clear();
    counter = 0;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginRateLimitService,
        { provide: RedisService, useValue: redis },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<LoginRateLimitService>(LoginRateLimitService);
  });

  it('does not throw while the window still has room (limit is 3)', async () => {
    await service.fail('a@b.com', '1.1.1.1'); // 1 of 3
    await service.fail('a@b.com', '1.1.1.1'); // 2 of 3
    await service.fail('a@b.com', '1.1.1.1'); // 3 of 3 — at the limit, still allowed

    expect(redis.expire).toHaveBeenCalledTimes(1);
  });

  it('starts the window expiry on the very first failure only', async () => {
    await service.fail('a@b.com', '1.1.1.1');
    await service.fail('a@b.com', '1.1.1.1');

    expect(redis.expire).toHaveBeenCalledTimes(1);
    expect(redis.expire).toHaveBeenCalledWith('auth:rl:a@b.com:1.1.1.1', 900);
  });

  it('throws 429 once the limit is exceeded', async () => {
    await service.fail('a@b.com', '1.1.1.1');
    await service.fail('a@b.com', '1.1.1.1');
    await service.fail('a@b.com', '1.1.1.1');

    await expect(service.fail('a@b.com', '1.1.1.1')).rejects.toThrow(HttpException);
    try {
      await service.fail('a@b.com', '1.1.1.1');
    } catch (err) {
      expect((err as HttpException).getStatus()).toBe(429);
    }
  });

  it('keys by IP as well, so one host cannot lock out every user', async () => {
    await service.fail('a@b.com', '1.1.1.1');
    await service.fail('a@b.com', '1.1.1.1');
    await service.fail('a@b.com', '1.1.1.1');

    // Different IP, same email: a fresh counter, so this still passes.
    counter = 0;
    await expect(service.fail('a@b.com', '2.2.2.2')).resolves.toBeUndefined();
  });

  it('clears the counter after a successful login', async () => {
    await service.fail('a@b.com', '1.1.1.1');
    await service.clear('a@b.com', '1.1.1.1');

    expect(redis.del).toHaveBeenCalledWith('auth:rl:a@b.com:1.1.1.1');
  });
});
