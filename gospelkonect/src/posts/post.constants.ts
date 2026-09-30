// The post response shape, shared by the posts, feeds and (later) search code.
// Kept in its own file — not inside PostsService — so FeedService can import
// the selects without importing the service or creating a module dependency.

import type { Prisma, ReactionType } from '@prisma/client';
import { toMediaDto, type MediaDto } from '../media/media.types.js';

// Author embedded in every post response — deliberately slim (no email, bio or
// timestamps), which is all a byline needs and keeps feed payloads small.
export const AUTHOR_SELECT = {
  id: true,
  name: true,
  username: true,
  avatar: true,
} satisfies Prisma.UserSelect;

// Explicit select rather than `include`: it guarantees the response shape
// exactly (no authorId, no passwordHash) even if the schema grows later.
// `media` walks PostMedia → Media in position order; Prisma nests the second
// hop (rows arrive as { media: {...} }), which toPostResponse flattens.
export const POST_SELECT = {
  id: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  author: { select: AUTHOR_SELECT },
  media: {
    orderBy: { position: 'asc' },
    select: { media: { select: { id: true, kind: true, mimeType: true, bytes: true } } },
  },
} satisfies Prisma.PostSelect;

/** Exactly what Prisma returns for POST_SELECT — nested, no URLs. */
export type RawPost = Prisma.PostGetPayload<{ select: typeof POST_SELECT }>;

/** The three reaction tallies of a post, keyed by type. */
export type ReactionTally = Record<ReactionType, number>;

/**
 * Engagement numbers attached to every post response (Phase 5). They are
 * loaded per page by post-metrics.ts, never inside POST_SELECT itself, so
 * cached feed pages keep carrying them and a plain row without metrics is
 * simply zeroed rather than malformed.
 */
export interface PostMetrics {
  commentCount: number;
  reactions: ReactionTally;
  /** The signed-in viewer's own reaction; null for anonymous readers. */
  viewerReaction: ReactionType | null;
}

export const EMPTY_REACTIONS: ReactionTally = { LIKE: 0, AMEN: 0, LOVE: 0 };

export const EMPTY_METRICS: PostMetrics = {
  commentCount: 0,
  reactions: EMPTY_REACTIONS,
  viewerReaction: null,
};

/** What every post-shaped endpoint returns: attachments flattened, URL set. */
export type PostResponse = Omit<RawPost, 'media'> & { media: MediaDto[] } & PostMetrics;

/**
 * One row → one response. The media URL is a stable /media/:id/file link
 * derived from the id, so this stays synchronous: no signing round trip on
 * every feed row, and cached pages stay valid. `metrics` defaults to the
 * zeroed tallies, which is exactly right for a brand-new post.
 */
export function toPostResponse(raw: RawPost, metrics: PostMetrics = EMPTY_METRICS): PostResponse {
  return {
    ...raw,
    media: raw.media.map((row) => toMediaDto(row.media)),
    commentCount: metrics.commentCount,
    reactions: { ...metrics.reactions },
    viewerReaction: metrics.viewerReaction,
  };
}

/** Ordering used by every post list: newest first, id breaks timestamp ties. */
export const POST_ORDER_BY = [
  { createdAt: 'desc' },
  // Keyset pagination needs a total order. Two posts created in the same
  // millisecond would otherwise page arbitrarily (and repeat across pages).
  { id: 'desc' },
] satisfies Prisma.PostOrderByWithRelationInput[];
