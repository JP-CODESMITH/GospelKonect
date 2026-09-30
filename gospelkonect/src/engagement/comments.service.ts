// CommentsService — reading and writing the conversation under a post.
//
// A comment belongs to one post and may reply to one other comment of that
// same post (parentId). Both relations cascade, so deleting a post (or a
// comment higher in the thread) cannot leave orphan rows behind.

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { paginated, type Paginated } from '../common/pagination.js';
import type { PaginationDto } from '../dtos/pagination.dto.js';
import type { CreateCommentDto, UpdateCommentDto } from '../dtos/comment.dto.js';
import { FeedCacheService } from '../feed/feed-cache.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { extractMentions } from '../notifications/mentions.js';
import {
  COMMENT_ORDER_BY,
  COMMENT_SELECT,
  toCommentResponse,
  type CommentResponse,
} from './comment.constants.js';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    // Every create/delete changes commentCount on the parent post, which is
    // embedded in cached feed pages.
    private readonly feedCache: FeedCacheService,
    // "Mary replied to your comment" / mention notifications live here.
    private readonly notifications: NotificationsService,
  ) {}

  /** Adds a top-level comment, or a reply when `parentId` is given. */
  async create(postId: string, authorId: string, dto: CreateCommentDto): Promise<CommentResponse> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });
    if (!post) throw new NotFoundException('Post not found');

    // The parent must be a comment ON THIS POST: accepting any id would let a
    // reply point at a thread it can never be rendered in.
    let parentAuthor: string | null = null;
    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
        select: { postId: true, authorId: true },
      });
      if (!parent || parent.postId !== postId) {
        throw new BadRequestException('Parent comment does not belong to this post');
      }
      parentAuthor = parent.authorId;
    }

    const comment = await this.prisma.comment.create({
      data: { postId, authorId, parentId: dto.parentId ?? null, content: dto.content },
      select: COMMENT_SELECT,
    });

    // Replies notify the parent comment's author; top-level comments notify
    // the post's author. Both are suppressed when they would notify yourself.
    if (parentAuthor) {
      await this.notifications.notify({
        userId: parentAuthor,
        actorId: authorId,
        type: 'REPLY',
        entityType: 'comment',
        entityId: comment.id,
      });
    } else {
      await this.notifications.notify({
        userId: post.authorId,
        actorId: authorId,
        type: 'COMMENT',
        entityType: 'comment',
        entityId: comment.id,
      });
    }
    await this.notifications.notifyMentionsFor(
      'comment',
      comment.id,
      authorId,
      extractMentions(dto.content),
    );
    // commentCount is part of every post response, so cached pages move.
    await this.feedCache.invalidate();
    return toCommentResponse(comment);
  }

  /** One post's conversation, oldest first so replies sit under their parents. */
  async list(postId: string, query: PaginationDto): Promise<Paginated<CommentResponse>> {
    const post = await this.prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) throw new NotFoundException('Post not found');

    const where = { postId };
    const [total, rows] = await Promise.all([
      this.prisma.comment.count({ where }),
      this.prisma.comment.findMany({
        where,
        orderBy: COMMENT_ORDER_BY,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: COMMENT_SELECT,
      }),
    ]);
    return paginated(rows.map(toCommentResponse), total, query.page, query.limit);
  }

  /** Replaces the body of your own comment; 403 if it belongs to someone else. */
  async update(id: string, userId: string, dto: UpdateCommentDto): Promise<CommentResponse> {
    await this.requireAuthor(id, userId);
    const updated = await this.prisma.comment.update({
      where: { id },
      data: { content: dto.content },
      select: COMMENT_SELECT,
    });
    return toCommentResponse(updated);
  }

  /**
   * Permanently deletes a comment and, by cascade, everything below it.
   * Notifications are polymorphic, so the ids of the whole subtree are walked
   * first and their rows cleaned afterwards.
   */
  async remove(id: string, userId: string): Promise<void> {
    await this.requireAuthor(id, userId);
    await this.deleteThread(id);
  }

  /** Content removal from the admin console: authorship is not consulted. */
  async removeAsModerator(id: string): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    await this.deleteThread(id);
  }

  /** Cascade-delete one comment and every reply under it, then clean up. */
  private async deleteThread(id: string): Promise<void> {
    const subtree = await this.collectSubtree(id);
    await this.prisma.comment.delete({ where: { id } });
    for (const targetId of subtree) {
      await this.notifications.removeForEntity('comment', targetId);
    }
    await this.feedCache.invalidate();
  }

  // --- helpers --------------------------------------------------------------

  /** 404 when there is no such comment, 403 when it belongs to someone else. */
  private async requireAuthor(id: string, userId: string): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only modify your own comment');
    }
  }

  /**
   * The comment plus every descendant, level by level. One query per depth is
   * fine here: threads are shallow in practice, and the alternative (a
   * recursive CTE through Prisma's raw API) buys little for a handful of rows.
   */
  private async collectSubtree(id: string): Promise<string[]> {
    const ids = [id];
    let frontier = [id];
    // Depth guard: a cycle cannot exist (parentId points strictly upward), but
    // an accidental self-loop should still terminate instead of hanging a request.
    for (let depth = 0; depth < 50 && frontier.length > 0; depth++) {
      const children = await this.prisma.comment.findMany({
        where: { parentId: { in: frontier } },
        select: { id: true },
      });
      frontier = children.map((child) => child.id);
      ids.push(...frontier);
    }
    return ids;
  }
}
