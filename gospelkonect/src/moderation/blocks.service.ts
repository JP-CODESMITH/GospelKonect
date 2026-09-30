// BlocksService — "I do not want to see this person, and they do not see me."
//
// Blocking is one row (blocker → blocked) but symmetric in effect: feeds and
// timelines exclude both directions, and a follow is refused either way. The
// actual predicates live in ./blocking.ts so every read path shares them.

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { paginated, type Paginated } from '../common/pagination.js';
import type { PaginationDto } from '../dtos/pagination.dto.js';
import { FeedCacheService } from '../feed/feed-cache.service.js';

/** What a block list row looks like: just enough to render the entry. */
export interface BlockEntry {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  createdAt: Date;
}

@Injectable()
export class BlocksService {
  constructor(
    private readonly prisma: PrismaService,
    // A block changes what BOTH accounts see, and feed pages are cached per
    // user with a version key — bump it so neither side keeps reading a page
    // built before the block.
    private readonly feedCache: FeedCacheService,
  ) {}

  /**
   * Blocks `targetId` for the caller. Idempotent by design — a client retrying
   * after a timeout must not turn into a 500, so an existing edge is a 204 too.
   */
  async block(blockerId: string, targetId: string): Promise<void> {
    if (blockerId === targetId) {
      throw new BadRequestException('You cannot block yourself');
    }
    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('User not found');

    let inserted = false;
    try {
      await this.prisma.block.create({ data: { blockerId, blockedId: targetId } });
      inserted = true;
    } catch (err) {
      // P2002 = the composite key already exists: we are already blocking.
      if ((err as { code?: string }).code !== 'P2002') throw err;
    }
    // Only a real change moves the cache — a repeat of an existing block has
    // already been reflected in it.
    if (inserted) await this.feedCache.invalidate();
  }

  /** Lifts a block. Removing something that is not there is still a 204. */
  async unblock(blockerId: string, targetId: string): Promise<void> {
    const { count } = await this.prisma.block.deleteMany({
      where: { blockerId, blockedId: targetId },
    });
    if (count > 0) await this.feedCache.invalidate();
  }

  /** Everyone the caller blocks, newest first. */
  async list(blockerId: string, query: PaginationDto): Promise<Paginated<BlockEntry>> {
    const where = { blockerId };
    const [total, rows] = await Promise.all([
      this.prisma.block.count({ where }),
      this.prisma.block.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          createdAt: true,
          blocked: { select: { id: true, name: true, username: true, avatar: true } },
        },
      }),
    ]);
    const items = rows.map((row) => ({ ...row.blocked, createdAt: row.createdAt }));
    return paginated(items, total, query.page, query.limit);
  }
}
