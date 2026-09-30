// Blocking, as pure helpers.
//
// Kept free of Nest (and of DI) so FeedService, PostsService and FollowsService
// can share the exact same predicates without importing a service — and so the
// tests can assert on the generated Prisma where-clauses directly.

import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service.js';

/**
 * Excludes posts authored by someone the viewer blocked, or who blocked the
 * viewer: blocking hides both directions.
 */
export function notBlockedBy(viewerId: string): Prisma.PostWhereInput {
  return {
    NOT: {
      OR: [
        // I blocked them.
        { author: { blockedBy: { some: { blockerId: viewerId } } } },
        // They blocked me.
        { author: { blocking: { some: { blockedId: viewerId } } } },
      ],
    },
  };
}

/** Same idea for user lists (discovery, follower pages). */
export function excludesBlockedUsers(viewerId: string): Prisma.UserWhereInput {
  return {
    NOT: {
      OR: [{ blockedBy: { some: { blockerId: viewerId } } }, { blocking: { some: { blockedId: viewerId } } }],
    },
  };
}

/**
 * True when either account has blocked the other. Used to refuse a follow —
 * blocking is symmetric for "can we interact", even though the row is not.
 */
export async function blockedBetween(
  prisma: Pick<PrismaService, 'block'>,
  a: string,
  b: string,
): Promise<boolean> {
  const edge = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { blockerId: true },
  });
  return edge !== null;
}
