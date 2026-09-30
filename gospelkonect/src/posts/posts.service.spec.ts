import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PostsService } from './posts.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { FeedCacheService } from '../feed/feed-cache.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { MediaService } from '../media/media.service.js';
import { PaginationDto } from '../dtos/pagination.dto.js';

// What findUnique/create return once POST_SELECT is applied: post scalars, the
// slim embedded author, and Prisma's nested attachment rows ({ media: {...} }),
// which toPostResponse flattens into media: [...] with URLs.
const postRow = {
  id: 'post_1',
  content: 'Hello GospelKonect',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  author: {
    id: 'user_1',
    name: 'johndoe',
    username: 'johndoe',
    avatar: null,
  },
  media: [] as { media: { id: string; kind: 'IMAGE'; mimeType: string; bytes: number } }[],
};

// Phase 5: every post response also carries its engagement tallies. A freshly
// read post with nothing happening around it answers with the zeroed set.
const withMetrics = (row: typeof postRow) => ({
  ...row,
  commentCount: 0,
  reactions: { LIKE: 0, AMEN: 0, LOVE: 0 },
  viewerReaction: null,
});

const page = (page = 1, limit = 20) => {
  const dto = new PaginationDto();
  dto.page = page;
  dto.limit = limit;
  return dto;
};

describe('PostsService', () => {
  let service: PostsService;

  // Vitest globals are enabled in vitest.config.ts (describe/it/expect/vi).
  // Stubbed: a write only has to bump the version, never talk to Redis here.
  const feedCache = {
    invalidate: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
  };

  // Mentions are extracted by a pure helper; the service call is stubbed so
  // these tests assert what was asked for, not how mentions are found.
  const notifications = {
    notifyMentions: vi.fn(),
    removeForEntity: vi.fn(),
  };

  // Attachment rules live in MediaService; here it just echoes the ids it was
  // asked to validate (empty by default, so text-only posts stay text-only).
  const media = {
    validateAttachments: vi.fn(async (_ownerId: string, ids: string[] = []) => ids),
    deleteOrphans: vi.fn(async () => undefined),
  };

  const prisma = {
    post: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
    postMedia: {
      findMany: vi.fn(async () => []),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    // Phase 5: comment/reaction tallies are loaded per page (post-metrics).
    // Empty by default — "no comments, no reactions, anonymous reader".
    comment: {
      groupBy: vi.fn(async () => []),
    },
    reaction: {
      groupBy: vi.fn(async () => []),
      findMany: vi.fn(async () => []),
    },
    // update() wraps the join-row replacement and the content change in one
    // transaction; run the callback against this same mock object.
    $transaction: vi.fn(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma)),
  };

  beforeEach(async () => {
    // Reset every mock so one test's stubs can't leak into the next.
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: PrismaService, useValue: prisma },
        { provide: FeedCacheService, useValue: feedCache },
        { provide: NotificationsService, useValue: notifications },
        { provide: MediaService, useValue: media },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);

    // Defaults; individual tests override what they care about.
    prisma.post.create.mockResolvedValue(postRow);
    prisma.post.findUnique.mockResolvedValue(postRow);
    prisma.post.findMany.mockResolvedValue([postRow]);
    prisma.post.count.mockResolvedValue(1);
    prisma.post.update.mockResolvedValue(postRow);
    prisma.post.delete.mockResolvedValue(postRow);
    prisma.user.findFirst.mockResolvedValue({ id: 'user_1' });
  });

  // --- create ---------------------------------------------------------------

  it('stores the content under the caller and returns the embedded author', async () => {
    const result = await service.create('user_1', { content: '  Hello GospelKonect  ' });

    expect(prisma.post.create).toHaveBeenCalledWith({
      data: { authorId: 'user_1', content: '  Hello GospelKonect  ' },
      // The explicit select is what guarantees passwordHash can never appear.
      select: expect.objectContaining({
        id: true,
        author: { select: expect.objectContaining({ id: true, avatar: true }) },
      }),
    });
    expect(result.author.username).toBe('johndoe');
    expect(result).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('authorId');
  });

  it('notifies the accounts the post mentions', async () => {
    await service.create('user_1', { content: 'cc @mary @john' });

    // Reaching the stored post id is what ties notifications to this post.
    expect(notifications.notifyMentions).toHaveBeenCalledWith(
      'post_1',
      'user_1',
      ['mary', 'john'],
    );
  });

  it('does not emit notifications for a post with no handles', async () => {
    await service.create('user_1', { content: 'plain' });

    expect(notifications.notifyMentions).toHaveBeenCalledWith('post_1', 'user_1', []);
  });

  // --- media attachments -----------------------------------------------------

  it('attaches uploaded media in the order the body listed', async () => {
    await service.create('user_1', { content: 'pic', mediaIds: ['m1', 'm2'] });

    expect(media.validateAttachments).toHaveBeenCalledWith('user_1', ['m1', 'm2']);
    expect(prisma.post.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          authorId: 'user_1',
          content: 'pic',
          media: {
            create: [
              { mediaId: 'm1', position: 0 },
              { mediaId: 'm2', position: 1 },
            ],
          },
        },
      }),
    );
  });

  it('publishes nothing when attachment validation fails', async () => {
    media.validateAttachments.mockRejectedValueOnce(new BadRequestException('Unknown media id'));

    await expect(
      service.create('user_1', { content: 'pic', mediaIds: ['foreign'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.post.create).not.toHaveBeenCalled();
  });

  it('replaces the attachment list when mediaIds is present, leaves it when absent', async () => {
    prisma.post.findUnique.mockResolvedValue({ authorId: 'user_1' });
    prisma.post.update.mockResolvedValue(postRow);

    await service.update('post_1', 'user_1', { content: 'edited', mediaIds: ['m2'] });

    expect(prisma.postMedia.deleteMany).toHaveBeenCalledWith({ where: { postId: 'post_1' } });
    expect(prisma.post.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { content: 'edited', media: { create: [{ mediaId: 'm2', position: 0 }] } },
      }),
    );

    prisma.postMedia.deleteMany.mockClear();
    await service.update('post_1', 'user_1', { content: 'edited again' });
    // No mediaIds in the PATCH → the attachments are untouched.
    expect(prisma.postMedia.deleteMany).not.toHaveBeenCalled();
    expect(prisma.post.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { content: 'edited again' } }),
    );
  });

  it('hands the former attachments to media cleanup when the post is deleted', async () => {
    prisma.post.findUnique.mockResolvedValue({ authorId: 'user_1' });
    prisma.postMedia.findMany.mockResolvedValue([{ mediaId: 'm1' }, { mediaId: 'm2' }]);

    await service.remove('post_1', 'user_1');

    // Snapshot before the cascade, so orphan detection can still see them.
    expect(prisma.postMedia.findMany).toHaveBeenCalledWith({
      where: { postId: 'post_1' },
      select: { mediaId: true },
    });
    expect(media.deleteOrphans).toHaveBeenCalledWith(['m1', 'm2'], 'user_1');
  });

  // --- getById --------------------------------------------------------------

  it('returns a post by id', async () => {
    await expect(service.getById('post_1')).resolves.toEqual(withMetrics(postRow));
    expect(prisma.post.findUnique).toHaveBeenCalledWith({
      where: { id: 'post_1' },
      select: expect.any(Object),
    });
  });

  it('404s on an unknown post id', async () => {
    prisma.post.findUnique.mockResolvedValue(null);
    await expect(service.getById('nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  // --- list -----------------------------------------------------------------

  it('pages the global feed newest-first and reports metadata', async () => {
    prisma.post.count.mockResolvedValue(45);

    const result = await service.list(page(2, 10));

    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' }, skip: 10, take: 10 }),
    );
    expect(result.meta).toEqual({ page: 2, limit: 10, total: 45, totalPages: 5 });
    expect(result.items).toEqual([withMetrics(postRow)]);
  });

  it('never reports totalPages of 0 for an empty feed', async () => {
    prisma.post.findMany.mockResolvedValue([]);
    prisma.post.count.mockResolvedValue(0);

    const result = await service.list(page());

    expect(result.items).toEqual([]);
    // Math.max(1, …): a client computing page+1 must not think there are pages
    // below an empty first page.
    expect(result.meta.totalPages).toBe(1);
  });

  // --- listByUsername -------------------------------------------------------

  it("reads one author's timeline using a case-insensitive handle", async () => {
    await service.listByUsername('JOHNDOE', page());

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { username: { equals: 'JOHNDOE', mode: 'insensitive' } },
      select: { id: true },
    });
    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { authorId: 'user_1' } }),
    );
  });

  it('404s when the handle does not exist, instead of returning an empty page', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(service.listByUsername('ghost', page())).rejects.toBeInstanceOf(
      NotFoundException,
    );
    // Nothing should be read from the posts table for a broken link.
    expect(prisma.post.findMany).not.toHaveBeenCalled();
  });

  // --- update ---------------------------------------------------------------

  it('lets the author replace the content', async () => {
    // Ownership check reads only authorId (the body is never fetched for an
    // edit that may be rejected).
    prisma.post.findUnique.mockResolvedValue({ authorId: 'user_1' });

    const result = await service.update('post_1', 'user_1', { content: 'edited' });

    expect(prisma.post.findUnique).toHaveBeenCalledWith({
      where: { id: 'post_1' },
      select: { authorId: true },
    });
    expect(prisma.post.update).toHaveBeenCalledWith({
      where: { id: 'post_1' },
      data: { content: 'edited' },
      select: expect.any(Object),
    });
    expect(result).toEqual(withMetrics(postRow));
  });

  it('404s when the post does not exist, before any ownership question', async () => {
    prisma.post.findUnique.mockResolvedValue(null);

    await expect(service.update('nope', 'user_1', { content: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.post.update).not.toHaveBeenCalled();
  });

  it("403s when the post belongs to someone else", async () => {
    prisma.post.findUnique.mockResolvedValue({ authorId: 'user_2' });

    await expect(
      service.update('post_1', 'user_1', { content: 'hijacked' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.post.update).not.toHaveBeenCalled();
  });

  // --- remove ---------------------------------------------------------------

  it('hard-deletes a post the caller owns', async () => {
    prisma.post.findUnique.mockResolvedValue({ authorId: 'user_1' });

    await expect(service.remove('post_1', 'user_1')).resolves.toBeUndefined();
    expect(prisma.post.delete).toHaveBeenCalledWith({ where: { id: 'post_1' } });
    // Otherwise a deleted post leaves its mention notifications orphaned.
    expect(notifications.removeForEntity).toHaveBeenCalledWith('post', 'post_1');
  });

  it("403s on deleting someone else's post", async () => {
    prisma.post.findUnique.mockResolvedValue({ authorId: 'user_2' });

    await expect(service.remove('post_1', 'user_1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.post.delete).not.toHaveBeenCalled();
    expect(notifications.removeForEntity).not.toHaveBeenCalled();
  });

  it('404s on deleting a post that is already gone', async () => {
    prisma.post.findUnique.mockResolvedValue(null);

    await expect(service.remove('post_1', 'user_1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.post.delete).not.toHaveBeenCalled();
    expect(notifications.removeForEntity).not.toHaveBeenCalled();
  });
});
