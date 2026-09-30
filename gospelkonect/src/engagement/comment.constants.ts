// The comment response shape. Kept out of the service so both the controller
// (typed Swagger responses) and the tests can import it without a cycle.

import type { Prisma } from '@prisma/client';
import { AUTHOR_SELECT } from '../posts/post.constants.js';

// Explicit select rather than `include`: no passwordHash, no email, ever —
// even though a comment is far less sensitive than a user row, the shape is
// pinned here once instead of being trusted to Prisma's inference.
export const COMMENT_SELECT = {
  id: true,
  postId: true,
  parentId: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  author: { select: AUTHOR_SELECT },
} satisfies Prisma.CommentSelect;

/** Exactly what Prisma returns for COMMENT_SELECT. */
export type RawComment = Prisma.CommentGetPayload<{ select: typeof COMMENT_SELECT }>;

/** The wire shape: flat, with `parentId` so a client can thread replies. */
export type CommentResponse = RawComment;

/**
 * One row → one response. No URL stamping is needed for a comment (only posts
 * and media carry links), so this is just a narrowing cast with a guard rail.
 */
export function toCommentResponse(raw: RawComment): CommentResponse {
  return raw;
}

/** Ordering used when reading a conversation: oldest first, id breaks ties. */
export const COMMENT_ORDER_BY = [
  { createdAt: 'asc' },
  { id: 'asc' },
] satisfies Prisma.CommentOrderByWithRelationInput[];
