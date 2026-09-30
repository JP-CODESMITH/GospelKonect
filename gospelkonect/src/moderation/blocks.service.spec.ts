import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BlocksService } from './blocks.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { FeedCacheService } from '../feed/feed-cache.service.js';

describe('BlocksService', () => {
  let service: BlocksService;

  const feedCache = { invalidate: vi.fn(), get: vi.fn(), set: vi.fn() };

  const prisma = {
    block: {
      create: vi.fn(),
      deleteMany: vi.fn(async () => ({ count: 1 })),
      count: vi.fn(async () => 0),
      findMany: vi.fn(async () => []),
      findFirst: vi.fn(async () => null),
    },
    user: { findUnique: vi.fn() },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlocksService,
        { provide: PrismaService, useValue: prisma },
        { provide: FeedCacheService, useValue: feedCache },
      ],
    }).compile();

    service = module.get<BlocksService>(BlocksService);
    prisma.user.findUnique.mockResolvedValue({ id: 'user_b' });
    prisma.block.create.mockResolvedValue({});
  });

  it('refuses to block yourself', async () => {
    await expect(service.block('user_a', 'user_a')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.block.create).not.toHaveBeenCalled();
  });

  it('404s when the account to block does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.block('user_a', 'user_missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('creates the edge and bumps the feed cache', async () => {
    await service.block('user_a', 'user_b');

    expect(prisma.block.create).toHaveBeenCalledWith({
      data: { blockerId: 'user_a', blockedId: 'user_b' },
    });
    expect(feedCache.invalidate).toHaveBeenCalled();
  });

  it('treats an existing block as success, without touching the cache', async () => {
    // P2002 = the composite key already exists. Blocking is a state, so a
    // repeat is a no-op — and a no-op must not churn every cached feed.
    prisma.block.create.mockRejectedValue(
      Object.assign(new Error('duplicate'), { code: 'P2002' }),
    );

    await expect(service.block('user_a', 'user_b')).resolves.toBeUndefined();
    expect(feedCache.invalidate).not.toHaveBeenCalled();
  });

  it('unblocks idempotently and only bumps the cache when something changed', async () => {
    prisma.block.deleteMany.mockResolvedValue({ count: 1 });
    await service.unblock('user_a', 'user_b');
    expect(feedCache.invalidate).toHaveBeenCalledTimes(1);

    prisma.block.deleteMany.mockResolvedValue({ count: 0 });
    await service.unblock('user_a', 'user_b');
    expect(feedCache.invalidate).toHaveBeenCalledTimes(1);
  });

  it('lists the accounts you blocked, newest first', async () => {
    prisma.block.count.mockResolvedValue(1);
    prisma.block.findMany.mockResolvedValue([
      {
        createdAt: new Date('2026-01-01T00:00:00Z'),
        blocked: { id: 'user_b', name: 'Bob', username: 'bob', avatar: null },
      },
    ]);

    const page = await service.list('user_a', { page: 1, limit: 20 } as never);
    expect(page.meta.total).toBe(1);
    expect(page.items[0]).toMatchObject({ id: 'user_b', username: 'bob' });
    expect(prisma.block.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
    );
  });
});
