// The post response shape, shared by the posts, feeds and (later) search code.
// Kept in its own file — not inside PostsService — so FeedService can import
// the selects without importing the service or creating a module dependency.

import type { Prisma } from '@prisma/client';
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

/** What every post-shaped endpoint returns: attachments flattened, URL set. */
export type PostResponse = Omit<RawPost, 'media'> & { media: MediaDto[] };

/**
 * One row → one response. The media URL is a stable /media/:id/file link
 * derived from the id, so this stays synchronous: no signing round trip on
 * every feed row, and cached pages stay valid.
 */
export function toPostResponse(raw: RawPost): PostResponse {
  return { ...raw, media: raw.media.map((row) => toMediaDto(row.media)) };
}

/** Ordering used by every post list: newest first, id breaks timestamp ties. */
export const POST_ORDER_BY = [
  { createdAt: 'desc' },
  // Keyset pagination needs a total order. Two posts created in the same
  // millisecond would otherwise page arbitrarily (and repeat across pages).
  { id: 'desc' },
] satisfies Prisma.PostOrderByWithRelationInput[];
