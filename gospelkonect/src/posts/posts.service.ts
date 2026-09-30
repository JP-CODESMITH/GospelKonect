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

// Author embedded in every post response — deliberately slim (no email, bio or
// timestamps), which is all a byline needs and keeps feed payloads small.
const AUTHOR_SELECT = {
  id: true,
  name: true,
  username: true,
  avatar: true,
} satisfies Prisma.UserSelect;

// Explicit select rather than `include`: it guarantees the response shape
// exactly (no authorId, no passwordHash) even if the schema grows later.
const POST_SELECT = {
  id: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  author: { select: AUTHOR_SELECT },
} satisfies Prisma.PostSelect;

/** What every post endpoint returns. */
export type PostResponse = Prisma.PostGetPayload<{ select: typeof POST_SELECT }>;

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Publishes a post as `authorId` and returns it with its author. */
  async create(authorId: string, dto: CreatePostDto): Promise<PostResponse> {
    return this.prisma.post.create({
      data: { authorId, content: dto.content },
      select: POST_SELECT,
    });
  }

  /** One post by id, or 404. */
  async getById(id: string): Promise<PostResponse> {
    const post = await this.prisma.post.findUnique({ where: { id }, select: POST_SELECT });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  /** Global feed, newest first. */
  async list(query: PaginationDto): Promise<Paginated<PostResponse>> {
    const [total, rows] = await Promise.all([
      this.prisma.post.count(),
      this.prisma.post.findMany({
        // New posts first: the feed's only ordering rule.
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: POST_SELECT,
      }),
    ]);
    return paginated(rows, total, query.page, query.limit);
  }

  /** One author's timeline, newest first. 404 when the handle doesn't exist. */
  async listByUsername(
    username: string,
    query: PaginationDto,
  ): Promise<Paginated<PostResponse>> {
    const author = await this.prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
      select: { id: true },
    });
    // 404 rather than an empty page: an unknown handle is a broken link, not a
    // valid "this user has no posts" answer.
    if (!author) throw new NotFoundException('User not found');

    const where: Prisma.PostWhereInput = { authorId: author.id };
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
    return paginated(rows, total, query.page, query.limit);
  }

  /** Replaces the body of the caller's own post. */
  async update(id: string, userId: string, dto: UpdatePostDto): Promise<PostResponse> {
    await this.requireAuthor(id, userId);
    // Prisma bumps updatedAt on any update (@updatedAt), so an edit is
    // distinguishable from the original publish time.
    return this.prisma.post.update({
      where: { id },
      data: { content: dto.content },
      select: POST_SELECT,
    });
  }

  /** Permanently removes the caller's own post. */
  async remove(id: string, userId: string): Promise<void> {
    await this.requireAuthor(id, userId);
    // Hard delete (Phase 4 decision). When media arrives, its files are
    // unlinked here too, in the same request.
    await this.prisma.post.delete({ where: { id } });
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
