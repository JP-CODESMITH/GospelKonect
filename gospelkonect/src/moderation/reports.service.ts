// ReportsService — the intake desk: anyone signed in can report a user, a
// post or a comment.
//
// Two properties matter here. The target is polymorphic (an id, not an FK), so
// a report outlives the thing it is about — an admin can still read it after
// the content is deleted. And reporting is idempotent per (reporter, target)
// while the report is still open: a second tap from a panicking user does not
// produce two rows in the queue.

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ReportReason, ReportStatus, ReportTargetType, type Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { paginated, type Paginated } from '../common/pagination.js';
import type { PaginationDto } from '../dtos/pagination.dto.js';

/** The wire shape for a report — no joins, just the fields an inbox needs. */
export interface ReportResponse {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  subjectUserId: string | null;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  resolution: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  reporter: { id: string; username: string };
}

const REPORT_SELECT = {
  id: true,
  targetType: true,
  targetId: true,
  subjectUserId: true,
  reason: true,
  details: true,
  status: true,
  resolution: true,
  createdAt: true,
  resolvedAt: true,
  reporter: { select: { id: true, username: true } },
} satisfies Prisma.ReportSelect;

export type RawReport = Prisma.ReportGetPayload<{ select: typeof REPORT_SELECT }>;

export const toReportResponse = (raw: RawReport): ReportResponse => raw;

/** What the intake needs to know about the reported row. */
interface ResolvedTarget {
  /** Owner of the row, for the admin queue. Null when it cannot be known. */
  subjectUserId: string | null;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Files a report, or returns the one that is already open on this target. */
  async create(
    reporterId: string,
    dto: { targetType: ReportTargetType; targetId: string; reason: ReportReason; details?: string },
  ): Promise<ReportResponse> {
    const target = await this.resolveTarget(dto.targetType, dto.targetId);
    if (dto.targetType === ReportTargetType.USER && dto.targetId === reporterId) {
      throw new BadRequestException('You cannot report yourself');
    }

    // Still-open reports by this reporter on this exact target are collapsed:
    // the queue must not fill with duplicates from one worried user.
    const open = await this.prisma.report.findFirst({
      where: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        status: { in: [ReportStatus.PENDING, ReportStatus.REVIEWING] },
      },
      select: REPORT_SELECT,
    });
    if (open) return toReportResponse(open);

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        subjectUserId: target.subjectUserId,
        reason: dto.reason,
        details: dto.details ?? null,
      },
      select: REPORT_SELECT,
    });
    return toReportResponse(report);
  }

  /** The caller's own reports, newest first — "what happened to my reports". */
  async listMine(reporterId: string, query: PaginationDto): Promise<Paginated<ReportResponse>> {
    const where: Prisma.ReportWhereInput = { reporterId };
    const [total, rows] = await Promise.all([
      this.prisma.report.count({ where }),
      this.prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: REPORT_SELECT,
      }),
    ]);
    return paginated(rows.map(toReportResponse), total, query.page, query.limit);
  }

  // --- helpers --------------------------------------------------------------

  /**
   * Proves the target exists and resolves its owner in one place, so a bad id
   * is a 404 before anything is written.
   */
  private async resolveTarget(
    targetType: ReportTargetType,
    targetId: string,
  ): Promise<ResolvedTarget> {
    switch (targetType) {
      case ReportTargetType.USER: {
        const user = await this.prisma.user.findUnique({
          where: { id: targetId },
          select: { id: true },
        });
        if (!user) throw new NotFoundException('Reported user not found');
        return { subjectUserId: user.id };
      }
      case ReportTargetType.POST: {
        const post = await this.prisma.post.findUnique({
          where: { id: targetId },
          select: { authorId: true },
        });
        if (!post) throw new NotFoundException('Reported post not found');
        return { subjectUserId: post.authorId };
      }
      case ReportTargetType.COMMENT: {
        const comment = await this.prisma.comment.findUnique({
          where: { id: targetId },
          select: { authorId: true },
        });
        if (!comment) throw new NotFoundException('Reported comment not found');
        return { subjectUserId: comment.authorId };
      }
    }
  }
}
