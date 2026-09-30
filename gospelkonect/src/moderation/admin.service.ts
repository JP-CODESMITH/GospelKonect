// AdminService — the operations behind the moderation console.
//
// Every mutation writes a ModerationAction row (append-only, no foreign keys,
// so deleting an account never erases the record that it was moderated), and
// the destructive ones reuse the owner-facing services so their side effects —
// feed invalidation, orphan media cleanup, notification removal — happen
// exactly once, in exactly one place.

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountStatus, ReportStatus, type Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { paginated, type Paginated } from '../common/pagination.js';
import type {
  AdminListQueryDto,
  AdminReportsQueryDto,
  SetRoleDto,
  SuspendUserDto,
  UpdateReportDto,
} from '../dtos/report.dto.js';
import { PostsService } from '../posts/posts.service.js';
import { CommentsService } from '../engagement/comments.service.js';
import { MediaService } from '../media/media.service.js';
import { FeedCacheService } from '../feed/feed-cache.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { toReportResponse, type ReportResponse } from './reports.service.js';

/** What a user row in the admin list looks like. */
export interface AdminUserRow {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string | null;
  role: string;
  status: AccountStatus;
  suspendedUntil: Date | null;
  suspendedReason: string | null;
  createdAt: Date;
  counts?: { posts: number; followers: number };
}

export interface AdminPostRow {
  id: string;
  content: string;
  createdAt: Date;
  author: { id: string; username: string };
  commentCount: number;
}

export interface AdminCommentRow {
  id: string;
  postId: string;
  content: string;
  createdAt: Date;
  author: { id: string; username: string };
}

export interface ModerationActionRow {
  id: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string | null;
  createdAt: Date;
}

const USER_SELECT = {
  id: true,
  name: true,
  username: true,
  email: true,
  avatar: true,
  role: true,
  status: true,
  suspendedUntil: true,
  suspendedReason: true,
  createdAt: true,
  _count: { select: { posts: true, followers: true } },
} satisfies Prisma.UserSelect;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    // Destructive actions delegate to the owners of those side effects.
    private readonly posts: PostsService,
    private readonly comments: CommentsService,
    private readonly media: MediaService,
    private readonly feedCache: FeedCacheService,
    private readonly notifications: NotificationsService,
  ) {}

  // --- users ----------------------------------------------------------------

  /** Every account, newest first, searchable by name/username/email. */
  async listUsers(query: AdminListQueryDto): Promise<Paginated<AdminUserRow>> {
    const where: Prisma.UserWhereInput = {
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { username: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
      ...(query.status && { status: query.status }),
    };
    const [total, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: USER_SELECT,
      }),
    ]);
    return paginated(rows, total, query.page, query.limit);
  }

  /** One account with the same columns as the list — 404 for a missing id. */
  async getUser(id: string): Promise<AdminUserRow> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: USER_SELECT });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /** Accounts currently suspended. Same shape as the full list. */
  async listSuspensions(query: AdminListQueryDto): Promise<Paginated<AdminUserRow>> {
    // Rebuilt field by field: query is a validated DTO (a class instance), and
    // spreading it would drop its prototype on the way to listUsers.
    return this.listUsers({
      page: query.page,
      limit: query.limit,
      search: query.search,
      status: AccountStatus.SUSPENDED,
    });
  }

  /** Suspends an account: API calls and new logins stop until the date passes. */
  async suspend(id: string, adminId: string, dto: SuspendUserDto): Promise<AdminUserRow> {
    await this.requireUser(id);
    if (id === adminId) throw new BadRequestException('You cannot suspend yourself');

    const until = dto.days ? new Date(Date.now() + dto.days * 24 * 60 * 60 * 1000) : null;
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        status: AccountStatus.SUSPENDED,
        suspendedUntil: until,
        suspendedReason: dto.reason ?? null,
      },
      select: USER_SELECT,
    });
    await this.log(adminId, 'user.suspend', 'user', id, dto.reason ?? undefined);
    return user;
  }

  /** Lifts a suspension early (or an expired one that was never cleared). */
  async unsuspend(id: string, adminId: string): Promise<AdminUserRow> {
    await this.requireUser(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: { status: AccountStatus.ACTIVE, suspendedUntil: null, suspendedReason: null },
      select: USER_SELECT,
    });
    await this.log(adminId, 'user.unsuspend', 'user', id);
    return user;
  }

  /** Grants or revokes ADMIN. An admin may not demote themselves. */
  async setRole(id: string, adminId: string, dto: SetRoleDto): Promise<AdminUserRow> {
    await this.requireUser(id);
    if (id === adminId && dto.role !== 'ADMIN') {
      throw new BadRequestException('You cannot demote your own account');
    }
    const user = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
      select: USER_SELECT,
    });
    await this.log(adminId, dto.role === 'ADMIN' ? 'user.promote' : 'user.demote', 'user', id);
    return user;
  }

  /**
   * Removes an account and everything that cascades from it (posts, comments,
   * reactions, follows, blocks), then its stored objects. The ids of the
   * content are read first because notifications point at them polymorphically
   * — there is no FK to cascade them away.
   */
  async removeAccount(id: string, adminId: string): Promise<void> {
    await this.requireUser(id);
    if (id === adminId) throw new BadRequestException('You cannot delete your own account');

    const [media, postIds, commentIds] = await Promise.all([
      this.prisma.media.findMany({ where: { ownerId: id }, select: { key: true } }),
      this.prisma.post.findMany({ where: { authorId: id }, select: { id: true } }),
      this.prisma.comment.findMany({ where: { authorId: id }, select: { id: true } }),
    ]);

    // User.delete cascades posts/comments/reactions/follows/blocks and the
    // media rows themselves; only the stored bytes need explicit removal.
    await this.prisma.user.delete({ where: { id } });
    await this.media.deleteObjects(media.map((row) => row.key));
    for (const postId of postIds) await this.notifications.removeForEntity('post', postId.id);
    for (const commentId of commentIds) {
      await this.notifications.removeForEntity('comment', commentId.id);
    }
    await this.feedCache.invalidate();
    await this.log(adminId, 'user.delete', 'user', id);
  }

  // --- content --------------------------------------------------------------

  /** Every post, newest first, with author and comment count for context. */
  async listPosts(query: AdminListQueryDto): Promise<Paginated<AdminPostRow>> {
    const where: Prisma.PostWhereInput = {
      ...(query.search && { content: { contains: query.search, mode: 'insensitive' } }),
    };
    const [total, rows] = await Promise.all([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: { select: { id: true, username: true } },
          _count: { select: { comments: true } },
        },
      }),
    ]);
    const items = rows.map((row) => ({
      id: row.id,
      content: row.content,
      createdAt: row.createdAt,
      author: row.author,
      commentCount: row._count.comments,
    }));
    return paginated(items, total, query.page, query.limit);
  }

  /** Content removal: same cascade as the author deleting it, plus the log. */
  async removePost(id: string, adminId: string): Promise<void> {
    await this.posts.removeAsModerator(id);
    await this.log(adminId, 'post.delete', 'post', id);
  }

  /** Every comment, newest first — for reviewing a reported thread. */
  async listComments(query: AdminListQueryDto): Promise<Paginated<AdminCommentRow>> {
    const where: Prisma.CommentWhereInput = {
      ...(query.search && { content: { contains: query.search, mode: 'insensitive' } }),
    };
    const [total, rows] = await Promise.all([
      this.prisma.comment.count({ where }),
      this.prisma.comment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true,
          postId: true,
          content: true,
          createdAt: true,
          author: { select: { id: true, username: true } },
        },
      }),
    ]);
    return paginated(rows, total, query.page, query.limit);
  }

  /** Content removal for a comment, replies included (same cascade). */
  async removeComment(id: string, adminId: string): Promise<void> {
    await this.comments.removeAsModerator(id);
    await this.log(adminId, 'comment.delete', 'comment', id);
  }

  // --- reports --------------------------------------------------------------

  /** The queue: filters for status and target type, newest first. */
  async listReports(query: AdminReportsQueryDto): Promise<Paginated<ReportResponse>> {
    const where: Prisma.ReportWhereInput = {
      ...(query.reportStatus && { status: query.reportStatus }),
      ...(query.targetType && { targetType: query.targetType }),
      ...(query.search && {
        details: { contains: query.search, mode: 'insensitive' },
      }),
    };
    const [total, rows] = await Promise.all([
      this.prisma.report.count({ where }),
      this.prisma.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
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
        },
      }),
    ]);
    return paginated(rows.map(toReportResponse), total, query.page, query.limit);
  }

  /**
   * Moves a report along the workflow. Closing it (RESOLVED/DISMISSED) records
   * who closed it and when, so "what did the moderator decide" is answerable
   * months later.
   */
  async updateReport(id: string, adminId: string, dto: UpdateReportDto): Promise<ReportResponse> {
    const existing = await this.prisma.report.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!existing) throw new NotFoundException('Report not found');
    if (existing.status === dto.status) {
      throw new BadRequestException(`Report is already ${dto.status}`);
    }
    // "Back to PENDING" is not a decision — it would reopen a closed report
    // and lose the trail of who closed it. Rejection mirrors the DTO's type.
    if (dto.status === ReportStatus.PENDING) {
      throw new BadRequestException('A report cannot be set back to PENDING');
    }

    const closing = dto.status === ReportStatus.RESOLVED || dto.status === ReportStatus.DISMISSED;
    const report = await this.prisma.report.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.resolution !== undefined && { resolution: dto.resolution }),
        ...(closing && { resolvedAt: new Date(), resolvedById: adminId }),
      },
      select: {
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
      },
    });
    await this.log(
      adminId,
      `report.${dto.status.toLowerCase()}`,
      'report',
      id,
      dto.resolution ?? undefined,
    );
    return toReportResponse(report);
  }

  /** The audit trail, newest first. */
  async listActions(query: AdminListQueryDto): Promise<Paginated<ModerationActionRow>> {
    const where: Prisma.ModerationActionWhereInput = {
      ...(query.search && { action: { contains: query.search, mode: 'insensitive' } }),
    };
    const [total, rows] = await Promise.all([
      this.prisma.moderationAction.count({ where }),
      this.prisma.moderationAction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);
    return paginated(rows, total, query.page, query.limit);
  }

  // --- helpers --------------------------------------------------------------

  /** 404 before any mutation touches a row that does not exist. */
  private async requireUser(id: string): Promise<AdminUserRow> {
    return this.getUser(id);
  }

  /** Append-only record of what a moderator did. */
  private async log(
    adminId: string,
    action: string,
    targetType: string,
    targetId: string,
    details?: string,
  ): Promise<void> {
    await this.prisma.moderationAction.create({
      data: { adminId, action, targetType, targetId, details: details ?? null },
    });
  }
}
