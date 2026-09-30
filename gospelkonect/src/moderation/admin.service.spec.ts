import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AccountStatus, ReportStatus } from '@prisma/client';
import { AdminService } from './admin.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PostsService } from '../posts/posts.service.js';
import { CommentsService } from '../engagement/comments.service.js';
import { MediaService } from '../media/media.service.js';
import { FeedCacheService } from '../feed/feed-cache.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

describe('AdminService', () => {
  let service: AdminService;

  const posts = { removeAsModerator: vi.fn() };
  const comments = { removeAsModerator: vi.fn() };
  const media = { deleteObjects: vi.fn(async () => undefined) };
  const feedCache = { invalidate: vi.fn(), get: vi.fn(), set: vi.fn() };
  const notifications = { removeForEntity: vi.fn(async () => undefined) };

  const prisma = {
    user: {
      findUnique: vi.fn(),
      count: vi.fn(async () => 0),
      findMany: vi.fn(async () => []),
      update: vi.fn(),
      delete: vi.fn(),
    },
    post: {
      count: vi.fn(async () => 0),
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(),
    },
    comment: {
      count: vi.fn(async () => 0),
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(),
    },
    report: {
      count: vi.fn(async () => 0),
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    moderationAction: { create: vi.fn(), count: vi.fn(async () => 0), findMany: vi.fn(async () => []) },
    media: { findMany: vi.fn(async () => []) },
  };

  const userRow = {
    id: 'user_b',
    name: 'Bob',
    username: 'bob',
    email: 'bob@example.com',
    avatar: null,
    role: 'USER' as const,
    status: AccountStatus.ACTIVE,
    suspendedUntil: null,
    suspendedReason: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    _count: { posts: 2, followers: 3 },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: PostsService, useValue: posts },
        { provide: CommentsService, useValue: comments },
        { provide: MediaService, useValue: media },
        { provide: FeedCacheService, useValue: feedCache },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prisma.user.findUnique.mockResolvedValue(userRow);
    prisma.user.update.mockResolvedValue({ ...userRow, status: AccountStatus.SUSPENDED });
    prisma.report.findUnique.mockResolvedValue({ status: ReportStatus.PENDING });
    prisma.report.update.mockResolvedValue({
      id: 'report_1',
      targetType: 'POST',
      targetId: 'post_1',
      subjectUserId: 'author_1',
      reason: 'SPAM',
      details: null,
      status: ReportStatus.RESOLVED,
      resolution: 'removed',
      createdAt: new Date(),
      resolvedAt: new Date(),
      reporter: { id: 'u', username: 'alice' },
    });
  });

  // --- accounts -------------------------------------------------------------

  it('404s every account mutation when the account is gone', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.suspend('user_x', 'admin_1', { days: 3 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.removeAccount('user_x', 'admin_1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('suspends with an expiry, records the action, and refuses self-suspension', async () => {
    const suspended = await service.suspend('user_b', 'admin_1', { days: 3, reason: 'spam' });

    expect(suspended.status).toBe(AccountStatus.SUSPENDED);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: AccountStatus.SUSPENDED,
          suspendedReason: 'spam',
        }),
      }),
    );
    expect(prisma.moderationAction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'user.suspend' }) }),
    );

    await expect(service.suspend('admin_1', 'admin_1', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('clears the suspension on unsuspend', async () => {
    await service.unsuspend('user_b', 'admin_1');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user_b' },
      data: { status: AccountStatus.ACTIVE, suspendedUntil: null, suspendedReason: null },
      select: expect.any(Object),
    });
    expect(prisma.moderationAction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'user.unsuspend' }) }),
    );
  });

  it('refuses to let an admin demote themselves', async () => {
    await expect(
      service.setRole('admin_1', 'admin_1', { role: 'USER' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(service.setRole('user_b', 'admin_1', { role: 'ADMIN' })).resolves.toBeDefined();
    expect(prisma.moderationAction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'user.promote' }) }),
    );
  });

  it('deletes an account: objects, notifications and the feed all follow', async () => {
    prisma.media.findMany.mockResolvedValue([{ key: 'media/a.png' }]);
    prisma.post.findMany.mockResolvedValue([{ id: 'post_1' }]);
    prisma.comment.findMany.mockResolvedValue([{ id: 'comment_1' }]);

    await service.removeAccount('user_b', 'admin_1');

    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user_b' } });
    expect(media.deleteObjects).toHaveBeenCalledWith(['media/a.png']);
    expect(notifications.removeForEntity).toHaveBeenCalledWith('post', 'post_1');
    expect(notifications.removeForEntity).toHaveBeenCalledWith('comment', 'comment_1');
    expect(feedCache.invalidate).toHaveBeenCalled();
    expect(prisma.moderationAction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'user.delete' }) }),
    );
  });

  it('refuses to delete your own account', async () => {
    await expect(service.removeAccount('admin_1', 'admin_1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  // --- content --------------------------------------------------------------

  it('delegates content removal to the owning services, then logs it', async () => {
    await service.removePost('post_1', 'admin_1');
    expect(posts.removeAsModerator).toHaveBeenCalledWith('post_1');
    expect(prisma.moderationAction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'post.delete' }) }),
    );

    await service.removeComment('comment_1', 'admin_1');
    expect(comments.removeAsModerator).toHaveBeenCalledWith('comment_1');
    expect(prisma.moderationAction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'comment.delete' }) }),
    );
  });

  // --- reports --------------------------------------------------------------

  it('moves a report along the workflow and stamps who closed it', async () => {
    const report = await service.updateReport('report_1', 'admin_1', {
      status: ReportStatus.RESOLVED,
      resolution: 'post removed',
    });

    expect(report.status).toBe(ReportStatus.RESOLVED);
    expect(prisma.report.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: ReportStatus.RESOLVED, resolvedById: 'admin_1' }),
      }),
    );
    expect(prisma.moderationAction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'report.resolved' }) }),
    );
  });

  it('refuses a transition to PENDING (staying open is not a decision)', async () => {
    await expect(
      service.updateReport('report_1', 'admin_1', { status: ReportStatus.PENDING as never }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('404s when the report is gone and rejects a no-op transition', async () => {
    prisma.report.findUnique.mockResolvedValue(null);
    await expect(
      service.updateReport('report_x', 'admin_1', { status: ReportStatus.RESOLVED }),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.report.findUnique.mockResolvedValue({ status: ReportStatus.RESOLVED });
    await expect(
      service.updateReport('report_1', 'admin_1', { status: ReportStatus.RESOLVED }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
