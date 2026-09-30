import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { PaginationDto } from '../dtos/pagination.dto.js';

const stored = {
  id: 'notif_1',
  type: 'NEW_FOLLOWER',
  entityType: null,
  entityId: null,
  readAt: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  actor: { id: 'user_2', name: 'mary', username: 'mary', avatar: null },
};

const page = (pageNo = 1, limit = 20) => {
  const dto = new PaginationDto();
  dto.page = pageNo;
  dto.limit = limit;
  return dto;
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  const prisma = {
    notification: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  };
  const publish = vi.fn();
  const redis = {
    getClient: () => ({ publish }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);

    publish.mockResolvedValue(1);
    prisma.notification.create.mockResolvedValue(stored);
    prisma.notification.findMany.mockResolvedValue([stored]);
    prisma.notification.count.mockResolvedValue(1);
    prisma.notification.updateMany.mockResolvedValue({ count: 1 });
    prisma.notification.deleteMany.mockResolvedValue({ count: 0 });
    prisma.user.findMany.mockResolvedValue([]);
  });

  // --- notify ---------------------------------------------------------------

  it('stores the row and publishes it on the recipient channel', async () => {
    const result = await service.notify({
      userId: 'user_1',
      actorId: 'user_2',
      type: 'NEW_FOLLOWER',
    });

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        userId: 'user_1',
        actorId: 'user_2',
        type: 'NEW_FOLLOWER',
        entityType: null,
        entityId: null,
      },
      select: expect.objectContaining({ actor: { select: expect.any(Object) } }),
    });
    expect(result).toEqual(stored);
    expect(publish).toHaveBeenCalledWith(
      'notifications:user_1',
      expect.stringContaining('"userId":"user_1"'),
    );
  });

  it('never notifies you about your own action', async () => {
    const result = await service.notify({
      userId: 'user_1',
      actorId: 'user_1',
      type: 'MENTION',
    });

    expect(result).toBeNull();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('swallows a database failure so the triggering action is not rolled back', async () => {
    prisma.notification.create.mockRejectedValue(new Error('db down'));

    await expect(
      service.notify({ userId: 'user_1', actorId: 'user_2', type: 'NEW_FOLLOWER' }),
    ).resolves.toBeNull();
  });

  it('still returns the row when the publish fails', async () => {
    publish.mockRejectedValue(new Error('no redis'));

    const result = await service.notify({
      userId: 'user_1',
      actorId: 'user_2',
      type: 'NEW_FOLLOWER',
    });

    expect(result).toEqual(stored);
  });

  // --- notifyMentions -------------------------------------------------------

  it('notifies each resolved mention against the post', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 'user_9' }]);

    await service.notifyMentions('post_1', 'user_2', ['mary', 'john']);

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { username: { in: ['mary', 'john'], mode: 'insensitive' } },
      select: { id: true },
    });
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user_9',
          type: 'MENTION',
          entityType: 'post',
          entityId: 'post_1',
        }),
      }),
    );
  });

  it('does nothing when the post has no handles', async () => {
    await service.notifyMentions('post_1', 'user_2', []);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('skips mentioning yourself', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 'user_2' }]);

    await service.notifyMentions('post_1', 'user_2', ['me']);

    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  // --- list / unread / markRead --------------------------------------------

  it('pages the inbox newest first', async () => {
    prisma.notification.count.mockResolvedValue(45);

    const result = await service.list('user_1', page(2, 10));

    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user_1' },
        skip: 10,
        take: 10,
      }),
    );
    expect(result.meta).toEqual({ page: 2, limit: 10, total: 45, totalPages: 5 });
    expect(result.items[0].actor.username).toBe('mary');
  });

  it('filters to unread only when asked', async () => {
    await service.list('user_1', page(), true);

    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user_1', readAt: null } }),
    );
  });

  it('counts only unread rows for the badge', async () => {
    await expect(service.unreadCount('user_1')).resolves.toBe(1);
    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { userId: 'user_1', readAt: null },
    });
  });

  it('marks specific ids read, scoped to the caller', async () => {
    await service.markRead('user_1', ['a', 'b']);

    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user_1', readAt: null, id: { in: ['a', 'b'] } },
      }),
    );
  });

  it('marks everything read when no ids are given', async () => {
    await expect(service.markRead('user_1')).resolves.toBe(1);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user_1', readAt: null } }),
    );
  });

  it('deletes notifications pointing at a deleted entity', async () => {
    await service.removeForEntity('post', 'post_1');

    expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
      where: { entityType: 'post', entityId: 'post_1' },
    });
  });
});
