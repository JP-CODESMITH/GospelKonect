import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommentsService } from './comments.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { FeedCacheService } from '../feed/feed-cache.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

// What findUnique/create return once COMMENT_SELECT is applied: comment
// scalars plus the slim embedded author (same shape as a post's author).
const commentRow = {
  id: 'comment_1',
  postId: 'post_1',
  parentId: null,
  content: 'Amen to this',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  author: { id: 'user_1', name: 'bob', username: 'bob', avatar: null },
};

describe('CommentsService', () => {
  let service: CommentsService;

  const feedCache = { invalidate: vi.fn(), get: vi.fn(), set: vi.fn() };

  const notifications = {
    notify: vi.fn(),
    notifyMentionsFor: vi.fn(),
    removeForEntity: vi.fn(),
  };

  const prisma = {
    post: {
      findUnique: vi.fn(),
    },
    comment: {
      findUnique: vi.fn(),
      findMany: vi.fn(async () => []),
      create: vi.fn(),
      count: vi.fn(async () => 0),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: FeedCacheService, useValue: feedCache },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
  });

  // --- create ---------------------------------------------------------------

  it('creates a top-level comment and tells the post author', async () => {
    prisma.post.findUnique.mockResolvedValue({ authorId: 'user_author' });
    prisma.comment.create.mockResolvedValue(commentRow);

    const result = await service.create('post_1', 'user_1', { content: 'Amen to this' });

    expect(result).toEqual(commentRow);
    expect(prisma.comment.create).toHaveBeenCalledWith({
      data: { postId: 'post_1', authorId: 'user_1', parentId: null, content: 'Amen to this' },
      select: expect.any(Object),
    });
    expect(notifications.notify).toHaveBeenCalledWith({
      userId: 'user_author',
      actorId: 'user_1',
      type: 'COMMENT',
      entityType: 'comment',
      entityId: 'comment_1',
    });
    expect(feedCache.invalidate).toHaveBeenCalled();
  });

  it('creates a reply and notifies the parent comment author instead', async () => {
    prisma.post.findUnique.mockResolvedValue({ authorId: 'user_author' });
    prisma.comment.findUnique.mockResolvedValue({ postId: 'post_1', authorId: 'user_parent' });
    prisma.comment.create.mockResolvedValue({ ...commentRow, parentId: 'comment_parent' });

    await service.create('post_1', 'user_1', { content: 'reply', parentId: 'comment_parent' });

    expect(prisma.comment.findUnique).toHaveBeenCalledWith({
      where: { id: 'comment_parent' },
      select: { postId: true, authorId: true },
    });
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user_parent', type: 'REPLY' }),
    );
    // The post author is not looped in on every nested reply.
    expect(notifications.notify).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'COMMENT' }),
    );
  });

  it('rejects a parent that belongs to a different post', async () => {
    prisma.post.findUnique.mockResolvedValue({ authorId: 'user_author' });
    prisma.comment.findUnique.mockResolvedValue({ postId: 'post_other', authorId: 'user_x' });

    await expect(
      service.create('post_1', 'user_1', { content: 'reply', parentId: 'comment_other' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.comment.create).not.toHaveBeenCalled();
  });

  it('404s when the post does not exist', async () => {
    prisma.post.findUnique.mockResolvedValue(null);

    await expect(service.create('post_missing', 'user_1', { content: 'hi' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  // --- list -----------------------------------------------------------------

  it('lists a conversation oldest first and 404s on an unknown post', async () => {
    prisma.post.findUnique.mockResolvedValue(null);
    await expect(service.list('post_missing', { page: 1, limit: 20 } as never)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    prisma.post.findUnique.mockResolvedValue({ id: 'post_1' });
    prisma.comment.findMany.mockResolvedValue([commentRow]);
    prisma.comment.count.mockResolvedValue(1);

    const page = await service.list('post_1', { page: 1, limit: 20 } as never);
    expect(page.meta.total).toBe(1);
    expect(page.items[0]).toEqual(commentRow);
    expect(prisma.comment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }),
    );
  });

  // --- update ---------------------------------------------------------------

  it('lets the author edit and refuses everyone else', async () => {
    // Base value per step rather than a Once queue: each branch is explicit
    // and a leftover queued answer cannot leak into the next assertion.
    prisma.comment.findUnique.mockResolvedValue({ authorId: 'user_1' });
    prisma.comment.update.mockResolvedValue({ ...commentRow, content: 'edited' });

    const updated = await service.update('comment_1', 'user_1', { content: 'edited' });
    expect(updated.content).toBe('edited');

    prisma.comment.findUnique.mockResolvedValue({ authorId: 'user_someone_else' });
    await expect(service.update('comment_1', 'user_other', { content: 'edited' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    prisma.comment.findUnique.mockResolvedValue(null);
    await expect(service.update('comment_missing', 'user_1', { content: 'edited' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  // --- remove ---------------------------------------------------------------

  it('deletes the whole subtree and cleans the notifications it leaves behind', async () => {
    prisma.comment.findUnique.mockResolvedValue({ authorId: 'user_1' });
    // Level 1: one child. Level 2: none.
    prisma.comment.findMany
      .mockResolvedValueOnce([{ id: 'comment_child' }])
      .mockResolvedValueOnce([]);

    await service.remove('comment_1', 'user_1');

    expect(prisma.comment.delete).toHaveBeenCalledWith({ where: { id: 'comment_1' } });
    expect(notifications.removeForEntity).toHaveBeenCalledWith('comment', 'comment_1');
    expect(notifications.removeForEntity).toHaveBeenCalledWith('comment', 'comment_child');
    expect(feedCache.invalidate).toHaveBeenCalled();
  });

  it('refuses to delete another user’s comment', async () => {
    prisma.comment.findUnique.mockResolvedValue({ authorId: 'user_someone_else' });

    await expect(service.remove('comment_1', 'user_1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.comment.delete).not.toHaveBeenCalled();
  });
});
