// post-metrics — the two tallies every post response carries: how many people
// commented (commentCount) and how many reacted per type (reactions), plus the
// signed-in viewer's own reaction.
//
// Deliberately three queries per page instead of a joined aggregate: counts
// come from groupBy (one scan over the small index per model), and the viewer's
// row only when there is a viewer. Anonymous readers never pay for it.

import type { ReactionType } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service.js';
import {
  EMPTY_METRICS,
  EMPTY_REACTIONS,
  type PostMetrics,
} from './post.constants.js';

/** Counts for a whole page of posts, keyed by post id. */
export async function loadPostMetrics(
  prisma: PrismaService,
  ids: string[],
  viewerId?: string | null,
): Promise<Map<string, PostMetrics>> {
  const metrics = new Map<string, PostMetrics>();
  if (ids.length === 0) return metrics;

  // Every row starts empty; the queries below only overwrite what exists.
  for (const id of ids) {
    metrics.set(id, { ...EMPTY_METRICS, reactions: { ...EMPTY_REACTIONS } });
  }

  const [commentCounts, reactionCounts, mine] = await Promise.all([
    prisma.comment.groupBy({
      by: ['postId'],
      where: { postId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.reaction.groupBy({
      by: ['postId', 'type'],
      where: { postId: { in: ids } },
      _count: { _all: true },
    }),
    viewerId
      ? prisma.reaction.findMany({
          where: { userId: viewerId, postId: { in: ids } },
          select: { postId: true, type: true },
        })
      : [],
  ]);

  for (const row of commentCounts) metrics.get(row.postId)!.commentCount = row._count._all;
  for (const row of reactionCounts) metrics.get(row.postId)!.reactions[row.type] = row._count._all;
  for (const row of mine) metrics.get(row.postId)!.viewerReaction = row.type;

  return metrics;
}

/** Merges each row's tallies into the row, leaving the row itself untouched. */
export function attachMetrics<T extends { id: string }>(
  rows: T[],
  metrics: Map<string, PostMetrics>,
): (T & PostMetrics)[] {
  return rows.map((row) => {
    const hit = metrics.get(row.id);
    return {
      ...row,
      ...(hit ?? { ...EMPTY_METRICS, reactions: { ...EMPTY_REACTIONS } }),
      reactions: { ...(hit?.reactions ?? EMPTY_REACTIONS) },
    };
  });
}

export type { ReactionType };
