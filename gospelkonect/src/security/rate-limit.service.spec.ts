import { HttpException } from '@nestjs/common';
import { RateLimitService, type RateLimitRule } from './rate-limit.service.js';
import type { RedisService } from '../redis/redis.service.js';

describe('RateLimitService', () => {
  let service: RateLimitService;
  let incr: ReturnType<typeof vi.fn>;
  let expire: ReturnType<typeof vi.fn>;

  const rule: RateLimitRule = { scope: 'posts', points: 3, windowSec: 60 };

  beforeEach(() => {
    vi.clearAllMocks();
    incr = vi.fn(async () => 1);
    expire = vi.fn(async () => 1);
    service = new RateLimitService({
      getClient: () => ({ incr }),
      expire,
    } as unknown as RedisService);
    delete process.env.RATE_LIMIT_POSTS;
    delete process.env.RATE_LIMIT_POSTS_WINDOW;
  });

  afterAll(() => {
    delete process.env.RATE_LIMIT_POSTS;
    delete process.env.RATE_LIMIT_POSTS_WINDOW;
  });

  it('sets the window only on the first hit of that window', async () => {
    await service.consume(rule, 'user_1');
    expect(expire).toHaveBeenCalledWith('rl:posts:user_1', 60);

    incr.mockResolvedValue(2);
    await service.consume(rule, 'user_1');
    // Second hit must not slide the expiry — that would keep the window open
    // for a steady stream forever.
    expect(expire).toHaveBeenCalledTimes(1);
  });

  it('throws 429 once the window is exceeded', async () => {
    incr.mockResolvedValue(4);
    await expect(service.consume(rule, 'user_1')).rejects.toMatchObject({ status: 429 });
    await expect(service.consume(rule, 'user_1')).rejects.toBeInstanceOf(HttpException);
  });

  it('honours a per-scope env override read at call time', async () => {
    // A test can tighten the limit without a restart — the value is read on
    // every consume, not cached in the constructor.
    process.env.RATE_LIMIT_POSTS = '1';
    incr.mockResolvedValue(2);

    await expect(service.consume(rule, 'user_1')).rejects.toMatchObject({ status: 429 });
  });

  it('treats a limit of 0 as "switched off"', async () => {
    process.env.RATE_LIMIT_POSTS = '0';
    incr.mockResolvedValue(999);

    await expect(service.consume(rule, 'user_1')).resolves.toBeUndefined();
    expect(incr).not.toHaveBeenCalled();
  });

  it('fails open when Redis is unreachable', async () => {
    incr.mockRejectedValue(new Error('connection refused'));

    // Availability over strictness: a Redis blip must not become an outage.
    await expect(service.consume(rule, 'user_1')).resolves.toBeUndefined();
  });

  it('falls back to the coded default when an override is not a number', async () => {
    process.env.RATE_LIMIT_POSTS = 'many';
    incr.mockResolvedValue(3);

    await expect(service.consume(rule, 'user_1')).resolves.toBeUndefined();
  });
});
