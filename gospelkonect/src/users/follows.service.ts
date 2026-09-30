// FollowsService — the directed social graph: follow, unfollow, and the two
// paginated lists (followers / following).
//
// A follow is a single row in `Follow`. The table's composite primary key
// guarantees uniqueness, so "follow" is idempotent at the database level and
// no read-before-write race can create duplicates.

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  PUBLIC_USER_SELECT,
  UsersService,
  type DiscoverUser,
  type Paginated,
} from './users.service.js';
import type { PaginationDto } from '../dtos/user-query.dto.js';
import type { Prisma, User } from '@prisma/client';

// Row as returned by findMany({ select: { follower: PUBLIC_USER_SELECT } }).
type SelectedUser = Omit<User, 'passwordHash' | 'updatedAt'>;

@Injectable()
export class FollowsService {
  constructor(
    private readonly prisma: PrismaService,
    // Reuses the profile shaping and relationship flags rather than
    // re-implementing them (they must stay identical across endpoints).
    private readonly users: UsersService,
  ) {}

  /**
   * Makes `followerId` follow `targetId`. Idempotent: repeating it is a 204
   * again, not a 409 — the UI should be able to safely re-send.
   */
  async follow(followerId: string, targetId: string): Promise<void> {
    if (followerId === targetId) {
      // The composite key would happily allow this; the business rule wouldn't.
      throw new BadRequestException('You cannot follow yourself');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
    if (!target) {
      throw new NotFoundException('User not found');
    }

    try {
      await this.prisma.follow.create({ data: { followerId, followingId: targetId } });
    } catch (err) {
      // P2002 = the edge already exists. Swallowed so the call stays idempotent;
      // every other failure (e.g. the target was deleted a millisecond ago)
      // still propagates as a 500 rather than being hidden.
      if ((err as { code?: string }).code !== 'P2002') throw err;
    }
  }

  /** Removes the edge. Also idempotent: unfollowing twice is still 204. */
  async unfollow(followerId: string, targetId: string): Promise<void> {
    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
    if (!target) {
      throw new NotFoundException('User not found');
    }

    // deleteMany instead of delete(): delete() throws when the row is absent,
    // which would turn a harmless repeat into a 404/500.
    await this.prisma.follow.deleteMany({
      where: { followerId, followingId: targetId },
    });
  }

  /** Paginated list of the accounts that follow `username`, newest first. */
  async listFollowers(
    username: string,
    pagination: PaginationDto,
    viewerId?: string,
  ): Promise<Paginated<DiscoverUser>> {
    const target = await this.requireUserByUsername(username);
    // `where` reads edges pointing AT the target, so each row's follower is the
    // user we return.
    const where: Prisma.FollowWhereInput = { followingId: target.id };

    const [total, rows] = await Promise.all([
      this.prisma.follow.count({ where }),
      this.prisma.follow.findMany({
        where,
        // Newest first: a profile should show its latest followers at the top.
        orderBy: { createdAt: 'desc' },
        skip: this.offset(pagination),
        take: pagination.limit,
        select: { follower: { select: PUBLIC_USER_SELECT } },
      }),
    ]);

    return this.pack(rows.map((r) => r.follower), total, pagination, viewerId);
  }

  /** Paginated list of the accounts `username` follows, newest first. */
  async listFollowing(
    username: string,
    pagination: PaginationDto,
    viewerId?: string,
  ): Promise<Paginated<DiscoverUser>> {
    const target = await this.requireUserByUsername(username);
    const where: Prisma.FollowWhereInput = { followerId: target.id };

    const [total, rows] = await Promise.all([
      this.prisma.follow.count({ where }),
      this.prisma.follow.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: this.offset(pagination),
        take: pagination.limit,
        select: { following: { select: PUBLIC_USER_SELECT } },
      }),
    ]);

    return this.pack(rows.map((r) => r.following), total, pagination, viewerId);
  }

  // --- helpers --------------------------------------------------------------

  /** Resolves a handle to a user, or 404s. */
  private async requireUserByUsername(username: string) {
    const target = await this.prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('User not found');
    return target;
  }

  /** Page numbers are 1-based; OFFSET is not. */
  private offset(pagination: PaginationDto): number {
    return (pagination.page - 1) * pagination.limit;
  }

  /**
   * Turns any list of selected users into the standard page envelope, adding
   * the viewer's relationship to each row in one query.
   */
  private async pack(
    users: SelectedUser[],
    total: number,
    pagination: PaginationDto,
    viewerId?: string,
  ): Promise<Paginated<DiscoverUser>> {
    const relationships = await this.users.viewerRelationship(
      viewerId,
      users.map((u) => u.id),
    );

    return {
      items: users.map((u) => ({
        ...this.users.toPublicUser(u, viewerId === u.id),
        ...(relationships.get(u.id) ?? { isFollowing: false, isFollowedBy: false }),
      })),
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
      },
    };
  }
}
