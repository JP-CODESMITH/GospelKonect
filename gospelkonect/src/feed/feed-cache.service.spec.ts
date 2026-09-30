import { Test, TestingModule } from '@nestjs/testing';
import { FeedCacheService } from './feed-cache.service.js';
import { RedisService } from '../redis/redis.service.js';

describe('FeedCacheService', () => {
  let service: FeedCacheService;

  const redis = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    getClient: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [FeedCacheService, { provide: RedisService, useValue: redis }],
    }).compile();

    service = module.get<FeedCacheService>(FeedCacheService);
    redis.get.mockResolvedValue(null);
    redis.set.mockResolvedValue('OK');
    redis.getClient.mockReturnValue({ incr: vi.fn().mockResolvedValue(1) });
  });

  it('returns the cached payload for the current version', async () => {
    redis.get
      .mockResolvedValueOnce('7') // version
      .mockResolvedValueOnce('{"items":[]}');

    await expect(service.get('user_1', 'p:1:20')).resolves.toBe('{"items":[]}');
    expect(redis.get).toHaveBeenNthCalledWith(1, 'feed:home:ver');
    expect(redis.get).toHaveBeenNthCalledWith(2, 'feed:home:7:user_1:p:1:20');
  });

  it('falls back to version 0 before the first invalidation', async () => {
    redis.get
      .mockResolvedValueOnce(null) // version key absent
      .mockResolvedValueOnce('payload');

    await expect(service.get('user_1', 'p:1:20')).resolves.toBe('payload');
    expect(redis.get).toHaveBeenNthCalledWith(2, 'feed:home:0:user_1:p:1:20');
  });

  it('writes with a TTL so a missed invalidation self-heals', async () => {
    redis.get.mockResolvedValue('3');
    await service.set('user_1', 'p:1:20', 'payload');

    expect(redis.set).toHaveBeenCalledWith('feed:home:3:user_1:p:1:20', 'payload', 30);
  });

  it('bumps the global version on invalidate', async () => {
    const incr = vi.fn().mockResolvedValue(2);
    redis.getClient.mockReturnValue({ incr });

    await service.invalidate();

    expect(incr).toHaveBeenCalledWith('feed:home:ver');
  });

  it('treats a Redis error as a cache miss rather than throwing', async () => {
    redis.get.mockRejectedValue(new Error('connection lost'));

    await expect(service.get('user_1', 'p:1:20')).resolves.toBeNull();
  });

  it('never fails a write path because Redis is down', async () => {
    redis.getClient.mockReturnValue({
      incr: vi.fn().mockRejectedValue(new Error('no redis')),
    });

    await expect(service.invalidate()).resolves.toBeUndefined();
  });

  it('swallows a failing set', async () => {
    redis.set.mockRejectedValue(new Error('readonly replica'));

    await expect(service.set('user_1', 'p:1:20', 'payload')).resolves.toBeUndefined();
  });
});
