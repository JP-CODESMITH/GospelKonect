// The post response shape, shared by the posts, feeds and (later) search code.
// Kept in its own file — not inside PostsService — so FeedService can import
// the selects without importing the service or creating a module dependency.

import type { Prisma } from '@prisma/client';

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
export const POST_SELECT = {
  id: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  author: { select: AUTHOR_SELECT },
} satisfies Prisma.PostSelect;

/** What every post-shaped endpoint returns. */
export type PostResponse = Prisma.PostGetPayload<{ select: typeof POST_SELECT }>;

/** Ordering used by every post list: newest first, id breaks timestamp ties. */
export const POST_ORDER_BY = [
  { createdAt: 'desc' },
  // Keyset pagination needs a total order. Two posts created in the same
  // millisecond would otherwise page arbitrarily (and repeat across pages).
  { id: 'desc' },
] satisfies Prisma.PostOrderByWithRelationInput[];
