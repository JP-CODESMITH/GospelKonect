import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReportReason, ReportTargetType } from '@prisma/client';
import { ReportsService } from './reports.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const reportRow = {
  id: 'report_1',
  targetType: ReportTargetType.POST,
  targetId: 'post_1',
  subjectUserId: 'author_1',
  reason: ReportReason.SPAM,
  details: null,
  status: 'PENDING' as const,
  resolution: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  resolvedAt: null,
  reporter: { id: 'reporter_1', username: 'alice' },
};

describe('ReportsService', () => {
  let service: ReportsService;

  const prisma = {
    report: { create: vi.fn(), findFirst: vi.fn(async () => null), findMany: vi.fn(async () => []), count: vi.fn(async () => 0) },
    user: { findUnique: vi.fn() },
    post: { findUnique: vi.fn() },
    comment: { findUnique: vi.fn() },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    prisma.post.findUnique.mockResolvedValue({ authorId: 'author_1' });
    prisma.user.findUnique.mockResolvedValue({ id: 'user_1' });
    prisma.comment.findUnique.mockResolvedValue({ authorId: 'commenter_1' });
    prisma.report.create.mockResolvedValue(reportRow);
  });

  const postReport = {
    targetType: ReportTargetType.POST,
    targetId: 'post_1',
    reason: ReportReason.SPAM,
  };

  it('files a report on a post and records the post’s author as the subject', async () => {
    const report = await service.create('reporter_1', postReport);

    expect(report).toEqual(reportRow);
    expect(prisma.report.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reporterId: 'reporter_1',
          targetType: ReportTargetType.POST,
          subjectUserId: 'author_1',
        }),
      }),
    );
  });

  it('collapses a second open report on the same target into the first', async () => {
    prisma.report.findFirst.mockResolvedValue(reportRow);

    const report = await service.create('reporter_1', postReport);

    expect(report.id).toBe('report_1');
    // The queue must not grow because a worried user tapped twice.
    expect(prisma.report.create).not.toHaveBeenCalled();
  });

  it('404s when the target does not exist — in all three target types', async () => {
    prisma.post.findUnique.mockResolvedValue(null);
    await expect(service.create('reporter_1', postReport)).rejects.toBeInstanceOf(NotFoundException);

    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.create('reporter_1', { targetType: ReportTargetType.USER, targetId: 'u', reason: ReportReason.SPAM }),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.comment.findUnique.mockResolvedValue(null);
    await expect(
      service.create('reporter_1', { targetType: ReportTargetType.COMMENT, targetId: 'c', reason: ReportReason.SPAM }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.report.create).not.toHaveBeenCalled();
  });

  it('refuses a report against yourself', async () => {
    await expect(
      service.create('user_1', { targetType: ReportTargetType.USER, targetId: 'user_1', reason: ReportReason.SPAM }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.report.create).not.toHaveBeenCalled();
  });

  it('pages your own reports newest first', async () => {
    prisma.report.findMany.mockResolvedValue([reportRow]);

    const page = await service.listMine('reporter_1', { page: 1, limit: 20 } as never);
    expect(page.meta.total).toBe(0);
    expect(page.items[0]).toEqual(reportRow);
    expect(prisma.report.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { reporterId: 'reporter_1' },
        orderBy: { createdAt: 'desc' },
      }),
    );
  });
});
