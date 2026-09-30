// ReactionsService — one reaction per user per post.
//
// PUT replaces whatever that user had (LIKE → LOVE is an update, not a second
// row) and DELETE removes theirs entirely; the primary key (userId, postId)
// makes a duplicate impossible at the database level.

import { Injectable, NotFoundException } from '@nestjs/common';
import type { ReactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { FeedCacheService } from '../feed/feed-cache.service.js';
import { loadPostMetrics } from '../posts/post-metrics.js';
import type { ReactionTally } from '../posts/post.constants.js';

/** What a reaction endpoint answers: the fresh tallies for that post. */
export interface ReactionState {
  reactions: ReactionTally;
  viewerReaction: ReactionType | null;
}

@Injectable()
export class ReactionsService {
  constructor(
    private readonly prisma: PrismaService,
    // reactions[] is embedded in every post response, so cached pages move.
    private readonly feedCache: FeedCacheService,
  ) {}

  /** Sets (or replaces) the caller's reaction on a post and returns the counts. */
  async set(postId: string, userId: string, type: ReactionType): Promise<ReactionState> {
    await this.requirePost(postId);
    await this.prisma.reaction.upsert({
      where: { userId_postId: { userId, postId } },
      create: { userId, postId, type },
      update: { type },
    });
    await this.feedCache.invalidate();
    return this.state(postId, userId);
  }

  /** Removes the caller's reaction; reacting again is then a fresh PUT. */
  async remove(postId: string, userId: string): Promise<ReactionState> {
    // deleteMany instead of delete: having no reaction is not an error.
    await this.prisma.reaction.deleteMany({ where: { userId, postId } });
    await this.feedCache.invalidate();
    return this.state(postId, userId);
  }

  // --- helpers --------------------------------------------------------------

  /** Fresh tallies for one post, including the viewer's own row. */
  private async state(postId: string, userId: string): Promise<ReactionState> {
    const metrics = await loadPostMetrics(this.prisma, [postId], userId);
    const hit = metrics.get(postId)!;
    return { reactions: hit.reactions, viewerReaction: hit.viewerReaction };
  }

  /** 404 for an unknown post, so a reaction cannot target a deleted row. */
  private async requirePost(postId: string): Promise<void> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('Post not found');
  }
}
