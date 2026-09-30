// PostsService — create, read, edit and delete posts, plus the two feeds
// (global and per-author).
//
// A post is author-owned: every mutation verifies the caller is the author
// AFTER checking the post exists, so a wrong id answers 404 (honest, since
// GET /posts/:id is public anyway) and a right id answers 403.

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma } from '@prisma/client';
import { paginated, type Paginated } from '../common/pagination.js';
import type { PaginationDto } from '../dtos/pagination.dto.js';
import type { CreatePostDto, UpdatePostDto } from '../dtos/post.dto.js';
import { FeedCacheService } from '../feed/feed-cache.service.js';
import { notBlockedBy } from '../moderation/blocking.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { extractMentions } from '../notifications/mentions.js';
import { MediaService } from '../media/media.service.js';

import { loadPostMetrics } from './post-metrics.js';
import {
  POST_SELECT,
  toPostResponse,
  type PostResponse,
} from './post.constants.js';

// Re-exported for callers that already import it from here.
export type { PostResponse } from './post.constants.js';

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    // Any write below changes every feed that could contain this post, so it
    // is followed by a cache invalidation (FeedModule exports it).
    private readonly feedCache: FeedCacheService,
    // Mentions in the body become notifications once the post exists.
    private readonly notifications: NotificationsService,
    // Attachment validation (ownership, the 4-images-or-1-video rule) and the
    // orphan cleanup that follows a delete live with the media pipeline.
    private readonly media: MediaService,
  ) {}

  /** Publishes a post as `authorId`, with its attachments, and returns it. */
  async create(authorId: string, dto: CreatePostDto): Promise<PostResponse> {
    // Uploads happen first (POST /media); this only proves the ids are the
    // caller's and re-attaches them in the order the body listed.
    const mediaIds = await this.media.validateAttachments(authorId, dto.mediaIds ?? []);
    const post = await this.prisma.post.create({
      data: {
        authorId,
        content: dto.content,
        ...(mediaIds.length > 0 && {
          media: {
            create: mediaIds.map((mediaId, position) => ({ mediaId, position })),
          },
        }),
      },
      select: POST_SELECT,
    });
    await this.feedCache.invalidate();
    // Typo'd handles resolve to nothing, so a mention can never fail a publish.
    await this.notifications.notifyMentions(post.id, authorId, extractMentions(dto.content));
    return toPostResponse(post);
  }

  /**
   * One post by id, or 404. `viewerId` (when the reader is signed in) is what
   * fills viewerReaction; anonymous readers get null instead of a wasted query.
   */
  async getById(id: string, viewerId?: string | null): Promise<PostResponse> {
    const post = await this.prisma.post.findUnique({ where: { id }, select: POST_SELECT });
    if (!post) throw new NotFoundException('Post not found');
    const metrics = await loadPostMetrics(this.prisma, [id], viewerId);
    return toPostResponse(post, metrics.get(id));
  }

  /** Global feed, newest first. */
  async list(query: PaginationDto, viewerId?: string | null): Promise<Paginated<PostResponse>> {
    // Typed explicitly: a conditional spread inside the call leaves Prisma's
    // generated overload unable to see the resulting where-clause shape.
    const where: Prisma.PostWhereInput = viewerId ? notBlockedBy(viewerId) : {};
    const [total, rows] = await Promise.all([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({
        // A signed-in reader never sees posts by someone in a block with
        // them; an anonymous one sees everything (all posts are public).
        where,
        // New posts first: the feed's only ordering rule.
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: POST_SELECT,
      }),
    ]);
    const metrics = await loadPostMetrics(
      this.prisma,
      rows.map((row) => row.id),
      viewerId,
    );
    return paginated(
      rows.map((row) => toPostResponse(row, metrics.get(row.id))),
      total,
      query.page,
      query.limit,
    );
  }

  /** One author's timeline, newest first. 404 when the handle doesn't exist. */
  async listByUsername(
    username: string,
    query: PaginationDto,
    viewerId?: string | null,
  ): Promise<Paginated<PostResponse>> {
    const author = await this.prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
      select: { id: true },
    });
    // 404 rather than an empty page: an unknown handle is a broken link, not a
    // valid "this user has no posts" answer.
    if (!author) throw new NotFoundException('User not found');

    const where: Prisma.PostWhereInput = {
      authorId: author.id,
      // Hides the timeline in both block directions; without a viewer the
      // timeline is a plain public read.
      ...(viewerId ? notBlockedBy(viewerId) : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: POST_SELECT,
      }),
    ]);
    const metrics = await loadPostMetrics(
      this.prisma,
      rows.map((row) => row.id),
      viewerId,
    );
    return paginated(
      rows.map((row) => toPostResponse(row, metrics.get(row.id))),
      total,
      query.page,
      query.limit,
    );
  }

  /** Replaces the body (and, when mediaIds is present, the attachments). */
  async update(
    id: string,
    userId: string,
    dto: UpdatePostDto,
    viewerId?: string | null,
  ): Promise<PostResponse> {
    await this.requireAuthor(id, userId);
    // undefined = keep the current attachments; a list (even []) replaces them.
    const mediaIds =
      dto.mediaIds === undefined
        ? null
        : await this.media.validateAttachments(userId, dto.mediaIds);

    // One transaction: the old slot rows and the new content must agree, or a
    // crash mid-way leaves a post with stale positions.
    const updated = await this.prisma.$transaction(async (tx) => {
      if (mediaIds) {
        await tx.postMedia.deleteMany({ where: { postId: id } });
      }
      return tx.post.update({
        where: { id },
        // Prisma bumps updatedAt on any update (@updatedAt), so an edit is
        // distinguishable from the original publish time.
        data: {
          content: dto.content,
          ...(mediaIds && mediaIds.length > 0 && {
            media: {
              create: mediaIds.map((mediaId, position) => ({ mediaId, position })),
            },
          }),
        },
        select: POST_SELECT,
      });
    });
    // Cached pages still carry the old body until the version moves. The
    // tallies were NOT reset by the edit, so they are reloaded rather than
    // zeroed — an edited post keeps its comments and reactions.
    await this.feedCache.invalidate();
    const metrics = await loadPostMetrics(this.prisma, [id], viewerId);
    return toPostResponse(updated, metrics.get(id));
  }

  /** Permanently removes the caller's own post and its unshared media. */
  async remove(id: string, userId: string): Promise<void> {
    await this.requireAuthor(id, userId);
    await this.removePost(id, userId);
  }

  /**
   * Same removal, ownership check skipped — used by the admin console. The
   * orphans are still cleaned against the POST'S author, because "is this
   * blob still wanted" is a question about its owner, not about the moderator.
   */
  async removeAsModerator(id: string): Promise<void> {
    const post = await this.prisma.post.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (!post) throw new NotFoundException('Post not found');
    await this.removePost(id, post.authorId);
  }

  /** The shared deletion path: cascade, orphan cleanup, cache, notifications. */
  private async removePost(id: string, ownerId: string): Promise<void> {
    // Snapshot the attachments before the cascade wipes the join rows, so the
    // blobs can be checked for orphans afterwards.
    const attached = await this.prisma.postMedia.findMany({
      where: { postId: id },
      select: { mediaId: true },
    });
    // Hard delete (Phase 4 decision); PostMedia goes with it by cascade.
    await this.prisma.post.delete({ where: { id } });
    // Only blobs nothing else points at are removed — a media row attached to
    // another post survives, as does one the author still holds unattached.
    await this.media.deleteOrphans(attached.map((row) => row.mediaId), ownerId);
    await this.feedCache.invalidate();
    // Notifications are polymorphic (not an FK), so orphan cleanup happens here.
    await this.notifications.removeForEntity('post', id);
  }

  // --- helpers --------------------------------------------------------------

  /**
   * Guards every mutation: 404 when there is no such post, 403 when the post
   * exists but belongs to someone else.
   */
  private async requireAuthor(id: string, userId: string): Promise<void> {
    const post = await this.prisma.post.findUnique({
      where: { id },
      // Only the ownership bit is fetched — the body is never read for an edit
      // we may end up rejecting.
      select: { authorId: true },
    });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only modify your own post');
    }
  }
}
