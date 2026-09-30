import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PostsService } from './posts.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { FeedCacheService } from '../feed/feed-cache.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PaginationDto } from '../dtos/pagination.dto.js';

// What findUnique/create return once the POST_SELECT is applied: post scalars
// plus the slim embedded author.
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
};

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

  // --- getById --------------------------------------------------------------

  it('returns a post by id', async () => {
    await expect(service.getById('post_1')).resolves.toEqual(postRow);
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
    expect(result.items).toEqual([postRow]);
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
    expect(result).toEqual(postRow);
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
