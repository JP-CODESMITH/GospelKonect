import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { FeedService } from './feed.service.js';
import { FeedCacheService } from './feed-cache.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { FeedQueryDto } from '../dtos/feed.dto.js';
import type { PostResponse } from '../posts/post.constants.js';

// Minimal post rows: only the fields the feed touches.
const row = (id: string, at: string): PostResponse =>
  ({
    id,
    content: `content ${id}`,
    createdAt: new Date(at),
    updatedAt: new Date(at),
    author: { id: `u_${id}`, name: id, username: id, avatar: null },
    // POST_SELECT's nested attachment rows; empty for these text-only posts.
    media: [] as never[],
  }) as PostResponse;

const query = (q: Partial<FeedQueryDto>): FeedQueryDto =>
  ({ page: 1, limit: 20, ...q }) as FeedQueryDto;

// Turns a cursor token back into its parts so tests can assert on them.
const readCursor = (token: string): { t: number; c: string; i: string } =>
  JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));

describe('FeedService', () => {
  let service: FeedService;

  const prisma = {
    post: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  };
  const cache = {
    get: vi.fn(),
    set: vi.fn(),
    invalidate: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedService,
        { provide: PrismaService, useValue: prisma },
        { provide: FeedCacheService, useValue: cache },
      ],
    }).compile();

    service = module.get<FeedService>(FeedService);

    // Defaults: empty feed, cache always cold.
    cache.get.mockResolvedValue(null);
    cache.set.mockResolvedValue(undefined);
    prisma.post.count.mockResolvedValue(0);
    prisma.post.findMany.mockResolvedValue([]);
  });

  // --- caching --------------------------------------------------------------

  it('serves a warm page from Redis without touching Postgres', async () => {
    const warm = { items: [row('cached', '2026-01-01T00:00:00Z')], meta: { limit: 2, total: 1, totalPages: 1, page: 1, nextCursor: null } };
    cache.get.mockResolvedValue(JSON.stringify(warm));

    const result = await service.getFeed('user_1', query({ page: 1, limit: 2 }));

    expect(result.items).toHaveLength(1);
    expect(prisma.post.findMany).not.toHaveBeenCalled();
    expect(prisma.post.count).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('stores a freshly computed page', async () => {
    await service.getFeed('user_1', query({ page: 1, limit: 2 }));

    expect(cache.set).toHaveBeenCalledWith(
      'user_1',
      'p:1:2',
      expect.stringContaining('"items"'),
    );
  });

  it('keys cursor pages separately from numbered pages', async () => {
    const token = Buffer.from(
      JSON.stringify({ t: 1, c: '2026-01-01T00:00:00.000Z', i: 'post_9' }),
    ).toString('base64url');

    await service.getFeed('user_1', query({ cursor: token, limit: 2 }));

    expect(cache.get).toHaveBeenCalledWith('user_1', `c:${token}`);
  });

  // --- offset mode ----------------------------------------------------------

  it('serves tier 0 (followed/self) first, then tops up with public posts', async () => {
    // 5 posts total, 2 of them mine-or-followed → page of 3 spans both tiers.
    prisma.post.count
      .mockResolvedValueOnce(5) // total
      .mockResolvedValueOnce(2); // tier 0

    prisma.post.findMany
      .mockResolvedValueOnce([row('a', '2026-01-03T00:00:00Z'), row('b', '2026-01-02T00:00:00Z')])
      .mockResolvedValueOnce([row('c', '2026-01-04T00:00:00Z')]);

    const result = await service.getFeed('user_1', query({ page: 1, limit: 3 }));

    expect(result.items.map((p) => p.id)).toEqual(['a', 'b', 'c']);
    expect(result.meta).toEqual({
      page: 1,
      limit: 3,
      total: 5,
      totalPages: 2,
      // Last row came from tier 1, so the cursor must continue there.
      nextCursor: expect.any(String),
    });
    expect(readCursor(result.meta.nextCursor as string).t).toBe(1);

    // Tier 0 only holds 2 rows, so it takes both and the page tops up with 1.
    expect(prisma.post.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ skip: 0, take: 2 }),
    );
    expect(prisma.post.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ skip: 0, take: 1 }),
    );
  });

  it('skips tier 0 entirely once the page starts past it', async () => {
    prisma.post.count
      .mockResolvedValueOnce(10) // total
      .mockResolvedValueOnce(2); // tier 0 — page 2 starts at offset 3

    prisma.post.findMany.mockResolvedValueOnce([row('x', '2026-01-05T00:00:00Z')]);

    const result = await service.getFeed('user_1', query({ page: 2, limit: 3 }));

    expect(result.items.map((p) => p.id)).toEqual(['x']);
    // One query only: take0 is 0, so the tier 0 fetch is never issued.
    expect(prisma.post.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 1, take: 3 }),
    );
  });

  it('returns nextCursor null when the feed is exhausted', async () => {
    prisma.post.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    prisma.post.findMany.mockResolvedValueOnce([row('only', '2026-01-01T00:00:00Z')]);

    const result = await service.getFeed('user_1', query({ page: 1, limit: 20 }));

    // Fewer rows than the limit → nothing more to ask for.
    expect(result.meta.nextCursor).toBeNull();
  });

  // --- cursor mode ----------------------------------------------------------

  it('continues inside tier 0 when the cursor says so', async () => {
    const token = Buffer.from(
      JSON.stringify({ t: 0, c: '2026-01-03T00:00:00.000Z', i: 'a' }),
    ).toString('base64url');
    prisma.post.count.mockResolvedValue(5);
    prisma.post.findMany.mockResolvedValueOnce([row('b', '2026-01-02T00:00:00Z')]);

    const result = await service.getFeed('user_1', query({ cursor: token, limit: 2 }));

    expect(result.items.map((p) => p.id)).toEqual(['b']);
    // Offset-less: the keyset predicate narrows the tier, skip stays 0.
    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 2,
        where: expect.objectContaining({ AND: expect.any(Array) }),
      }),
    );
    // Short page → exhausted, so no further cursor.
    expect(result.meta.nextCursor).toBeNull();
    expect(result.meta.page).toBeUndefined();
  });

  it('falls through from an exhausted tier 0 into public posts', async () => {
    const token = Buffer.from(
      JSON.stringify({ t: 0, c: '2026-01-03T00:00:00.000Z', i: 'a' }),
    ).toString('base64url');
    prisma.post.count.mockResolvedValue(5);

    // Tier 0 has nothing left after the cursor; tier 1 fills the whole page.
    prisma.post.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        row('public-1', '2026-01-04T00:00:00Z'),
        row('public-2', '2026-01-03T00:00:00Z'),
      ]);

    const result = await service.getFeed('user_1', query({ cursor: token, limit: 2 }));

    expect(result.items.map((p) => p.id)).toEqual(['public-1', 'public-2']);
    // The cursor moved to tier 1 so the next page continues in tier 1.
    expect(readCursor(result.meta.nextCursor as string).t).toBe(1);
  });

  it('rejects a malformed cursor instead of silently restarting', async () => {
    await expect(service.getFeed('user_1', query({ cursor: 'not-a-cursor' }))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.post.findMany).not.toHaveBeenCalled();
  });

  it('rejects a cursor whose tier is out of range', async () => {
    const token = Buffer.from(
      JSON.stringify({ t: 7, c: '2026-01-01T00:00:00.000Z', i: 'a' }),
    ).toString('base64url');

    await expect(service.getFeed('user_1', query({ cursor: token }))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
