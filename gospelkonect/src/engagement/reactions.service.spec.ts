import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReactionsService, type ReactionState } from './reactions.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { FeedCacheService } from '../feed/feed-cache.service.js';

describe('ReactionsService', () => {
  let service: ReactionsService;

  const feedCache = { invalidate: vi.fn(), get: vi.fn(), set: vi.fn() };

  const prisma = {
    post: { findUnique: vi.fn() },
    reaction: {
      upsert: vi.fn(),
      deleteMany: vi.fn(async () => ({ count: 1 })),
      groupBy: vi.fn(async () => []),
      findMany: vi.fn(async () => []),
    },
    // post-metrics also asks for comment counts; nothing is commenting here.
    comment: { groupBy: vi.fn(async () => []) },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReactionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: FeedCacheService, useValue: feedCache },
      ],
    }).compile();

    service = module.get<ReactionsService>(ReactionsService);
    // Defaults after the clear: a previous test's implementation must not
    // survive into this one (clearAllMocks drops calls, not answers).
    prisma.post.findUnique.mockResolvedValue({ id: 'post_1' });
    prisma.reaction.groupBy.mockResolvedValue([]);
    prisma.reaction.findMany.mockResolvedValue([]);
    prisma.reaction.upsert.mockResolvedValue({});
    prisma.reaction.deleteMany.mockResolvedValue({ count: 1 });
    prisma.comment.groupBy.mockResolvedValue([]);
  });

  /** What loadPostMetrics would answer for one LIKE by this viewer. */
  const viewerLiked: ReactionState = {
    reactions: { LIKE: 1, AMEN: 0, LOVE: 0 },
    viewerReaction: 'LIKE',
  };

  it('upserts the caller’s reaction and returns the fresh tallies', async () => {
    // Tallies come from groupBy; the viewer's own row from findMany.
    prisma.reaction.groupBy.mockResolvedValue([
      { postId: 'post_1', type: 'LIKE', _count: { _all: 1 } },
    ]);
    prisma.reaction.findMany.mockResolvedValue([{ postId: 'post_1', type: 'LIKE' }]);

    const state = await service.set('post_1', 'user_1', 'LIKE');

    expect(prisma.reaction.upsert).toHaveBeenCalledWith({
      where: { userId_postId: { userId: 'user_1', postId: 'post_1' } },
      create: { userId: 'user_1', postId: 'post_1', type: 'LIKE' },
      update: { type: 'LIKE' },
    });
    expect(state).toEqual(viewerLiked);
    expect(feedCache.invalidate).toHaveBeenCalled();
  });

  it('404s when the post is gone', async () => {
    prisma.post.findUnique.mockResolvedValue(null);

    await expect(service.set('post_gone', 'user_1', 'LIKE')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.reaction.upsert).not.toHaveBeenCalled();
  });

  it('removes the caller’s reaction without erroring when there was none', async () => {
    prisma.reaction.deleteMany.mockResolvedValue({ count: 0 });
    prisma.reaction.groupBy.mockResolvedValue([]);

    const state = await service.remove('post_1', 'user_1');

    expect(prisma.reaction.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user_1', postId: 'post_1' },
    });
    expect(state).toEqual({ reactions: { LIKE: 0, AMEN: 0, LOVE: 0 }, viewerReaction: null });
    expect(feedCache.invalidate).toHaveBeenCalled();
  });
});
