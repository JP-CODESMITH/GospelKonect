// FeedService — the home timeline.
//
// Composition (Phase 6 decision): posts from people you follow, plus your own
// posts, then everyone else as fill. Practically that means two tiers, each
// ordered newest-first:
//
//   tier 0  authors I follow  ∪  me
//   tier 1  everyone else     (all posts are public, so this is the fill)
//
// Both tiers are served from ONE pass per page: fill up from tier 0, top up
// from tier 1. The split is expressed as a Prisma relation predicate, which
// compiles to an EXISTS subquery over the indexed Follow table — no
// "SELECT every id I follow then IN (...)" list that blows up at 5k follows.

import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma } from '@prisma/client';
import {
  POST_ORDER_BY,
  POST_SELECT,
  toPostResponse,
  type PostResponse,
} from '../posts/post.constants.js';
import { FeedCacheService } from './feed-cache.service.js';
import type { FeedQueryDto } from '../dtos/feed.dto.js';

/** Feed paging metadata: always total/limit, `page` only in offset mode. */
export interface FeedMeta {
  limit: number;
  total: number;
  totalPages: number;
  /** Present only when the caller paginated by page number. */
  page?: number;
  /** Opaque keyset token for the next page; null when the feed is exhausted. */
  nextCursor: string | null;
}

export interface FeedPage<T> {
  items: T[];
  meta: FeedMeta;
}

/** Decoded cursor: which tier we are in and where inside it we stopped. */
interface FeedCursor {
  tier: 0 | 1;
  createdAt: Date;
  id: string;
}

/** Serialises a cursor into an opaque, URL-safe token. */
const encodeCursor = ({ tier, createdAt, id }: FeedCursor): string =>
  Buffer.from(JSON.stringify({ t: tier, c: createdAt.toISOString(), i: id })).toString(
    'base64url',
  );

/** Parses a cursor token, rejecting anything malformed with a 400. */
const decodeCursor = (raw: string): FeedCursor => {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    const { t, c, i } = parsed as { t?: unknown; c?: unknown; i?: unknown };
    const createdAt = new Date(String(c));
    if ((t !== 0 && t !== 1) || Number.isNaN(createdAt.getTime()) || typeof i !== 'string') {
      throw new Error('bad shape');
    }
    return { tier: t, createdAt, id: i };
  } catch {
    // Never silently restart the feed: a corrupt cursor is a client bug.
    throw new BadRequestException('Invalid feed cursor');
  }
};

@Injectable()
export class FeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: FeedCacheService,
  ) {}

  /** Builds one page of the home timeline for `userId`. */
  async getFeed(userId: string, query: FeedQueryDto): Promise<FeedPage<PostResponse>> {
    const limit = query.limit;
    const cursor = query.cursor ? decodeCursor(query.cursor) : null;

    // The cache key is per-user and per-page; the version prefix (inside the
    // cache service) is what makes every key rot on the next write.
    const pageKey = cursor ? `c:${query.cursor}` : `p:${query.page}:${limit}`;
    const cached = await this.cache.get(userId, pageKey);
    if (cached) {
      // Dates are ISO strings after the round trip — exactly what the JSON
      // response would have contained anyway, so the wire format is unchanged.
      return JSON.parse(cached) as FeedPage<PostResponse>;
    }

    const page = cursor ? null : query.page;
    const result = cursor
      ? await this.byCursor(userId, cursor, limit)
      : await this.byOffset(userId, page as number, limit);

    await this.cache.set(userId, pageKey, JSON.stringify(result));
    return result;
  }

  // --- pagination strategies ------------------------------------------------

  /** Keyset continuation: immune to posts being inserted while scrolling. */
  private async byCursor(
    userId: string,
    cursor: FeedCursor,
    limit: number,
  ): Promise<FeedPage<PostResponse>> {
    const total = await this.prisma.post.count();

    if (cursor.tier === 0) {
      // Continue tier 0 from where we stopped…
      const first = await this.fetch(this.tier0(userId), 0, limit, this.after(cursor));
      if (first.length === limit) {
        // Still inside tier 0 — hand back the continuation token immediately
        // rather than issuing a second query we would throw away.
        return this.build(first, limit, total, null, cursorAt(first, 0));
      }
      // …then top up from the newest tier 1 posts (tier 1 starts over: it has
      // no position of its own until we actually enter it).
      const room = limit - first.length;
      const rest = await this.fetch(this.tier1(userId), 0, room);
      const items = [...first, ...rest];
      // Once any tier 1 row appears the cursor must point into tier 1 —
      // resuming in tier 0 would re-serve rows we already handed out.
      return this.build(items, limit, total, null, cursorAt(items, rest.length ? 1 : 0));
    }

    const rest = await this.fetch(this.tier1(userId), 0, limit, this.after(cursor));
    return this.build(rest, limit, total, null, cursorAt(rest, 1));
  }

  /** Offset pagination, with the two tiers stitched together arithmetically. */
  private async byOffset(
    userId: string,
    page: number,
    limit: number,
  ): Promise<FeedPage<PostResponse>> {
    const [total, tier0Total] = await Promise.all([
      this.prisma.post.count(),
      this.prisma.post.count({ where: this.tier0(userId) }),
    ]);

    // Where this page starts inside the combined stream (tier 0, then tier 1).
    const start = (page - 1) * limit;
    const intoTier1 = Math.max(0, start - tier0Total);
    const skip0 = Math.min(start, tier0Total);
    const take0 = Math.max(0, Math.min(limit - intoTier1, tier0Total - skip0));

    const [first, rest] = await Promise.all([
      this.fetch(this.tier0(userId), skip0, take0),
      this.fetch(this.tier1(userId), intoTier1, limit - take0),
    ]);

    const items = [...first, ...rest];
    return this.build(items, limit, total, page, cursorAt(items, rest.length ? 1 : 0));
  }

  // --- helpers --------------------------------------------------------------

  /** Posts by people `userId` follows, plus their own. */
  private tier0(userId: string): Prisma.PostWhereInput {
    return {
      OR: [
        { authorId: userId },
        // Compiles to EXISTS (SELECT 1 FROM Follow …) — an index lookup on
        // Follow(followingId, followerId), not a materialised id list.
        { author: { followers: { some: { followerId: userId } } } },
      ],
    };
  }

  /** Everything else: all posts are public, so this is the fill tier. */
  private tier1(userId: string): Prisma.PostWhereInput {
    return { NOT: this.tier0(userId) };
  }

  /** Keyset predicate matching POST_ORDER_BY (createdAt DESC, id DESC). */
  private after({ createdAt, id }: FeedCursor): Prisma.PostWhereInput {
    return {
      OR: [
        { createdAt: { lt: createdAt } },
        { createdAt, id: { lt: id } },
      ],
    };
  }

  private async fetch(
    where: Prisma.PostWhereInput,
    skip: number,
    take: number,
    after?: Prisma.PostWhereInput,
  ): Promise<PostResponse[]> {
    if (take <= 0) return [];
    const rows = await this.prisma.post.findMany({
      // A cursor narrows the same query rather than filtering in memory.
      where: after ? { AND: [where, after] } : where,
      orderBy: POST_ORDER_BY,
      skip,
      take,
      select: POST_SELECT,
    });
    // Flatten attachments here, before the cache: cached pages are then
    // exactly the wire shape and need no rewriting on read.
    return rows.map(toPostResponse);
  }

  private build(
    items: PostResponse[],
    limit: number,
    total: number,
    page: number | null,
    nextCursor: string | null,
  ): FeedPage<PostResponse> {
    return {
      items,
      meta: {
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        ...(page !== null && { page }),
        // "There might be more": one extra empty page on the last fill is
        // cheaper than a count query per request.
        nextCursor: items.length === limit ? nextCursor : null,
      },
    };
  }
}

/**
 * Cursor for "continue after this list", or null when it is empty. `tier` is
 * the tier the LAST row belongs to — getting it wrong would resume the next
 * page in the wrong tier and repeat or skip rows.
 */
function cursorAt(items: PostResponse[], tier: 0 | 1): string | null {
  const last = items.at(-1);
  return last ? encodeCursor({ tier, createdAt: last.createdAt, id: last.id }) : null;
}
