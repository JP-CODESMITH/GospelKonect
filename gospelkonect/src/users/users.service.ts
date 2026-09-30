// UsersService — profile reads, profile edits and discovery/search.
// Follow edges live in FollowsService; this file only reports on them.

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma, User } from '@prisma/client';
import { LocalStorageService } from '../storage/local-storage.service.js';
import type { UpdateUserDto } from '../dtos/update-user.dto.js';
import type { SearchUsersDto } from '../dtos/user-query.dto.js';
import { paginated, type Paginated } from '../common/pagination.js';

/** What a profile response returns — never includes passwordHash. */
export interface PublicUser {
  id: string;
  name: string;
  username: string;
  email?: string; // Only present on your own profile.
  avatar: string | null;
  bio: string | null;
  createdAt: Date;
}

/** Profile plus graph metrics. */
export interface UserProfile extends PublicUser {
  counts: { followers: number; following: number };
  isFollowing: boolean; // Does the viewer follow this user?
  isFollowedBy: boolean; // Does this user follow the viewer back?
}

/** A discovery row: profile plus the viewer's relationship to it. */
export type DiscoverUser = PublicUser & {
  isFollowing: boolean;
  isFollowedBy: boolean;
};

// Re-exported so followers/discovery consumers keep a single import site.
export type { Paginated } from '../common/pagination.js';

// Reused by both read and search so every profile response strips the hash in
// exactly one place.
export const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  username: true,
  email: true,
  avatar: true,
  bio: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalStorageService,
  ) {}

  /**
   * Loads one profile by username (case-insensitive) with follower/following
   * counts and, when the caller is authenticated, their relationship to it.
   * Throws 404 when the handle doesn't exist.
   */
  async getProfile(username: string, viewerId?: string): Promise<UserProfile> {
    const user = await this.prisma.user.findFirst({
      // Case-insensitive so /users/John and /users/john resolve to one account.
      where: { username: { equals: username, mode: 'insensitive' } },
      select: PUBLIC_USER_SELECT,
    });
    if (!user) {
      // Deliberately the same message as a wrong username: profiles are public,
      // so there is nothing to hide here.
      throw new NotFoundException('User not found');
    }

    const counts = await this.countEdges(user.id);
    const relationship = await this.viewerRelationship(viewerId, [user.id]);
    return {
      ...this.toPublicUser(user, viewerId === user.id),
      counts,
      ...(relationship.get(user.id) ?? { isFollowing: false, isFollowedBy: false }),
    };
  }

  /**
   * Updates the caller's own name/username/bio. Username collisions are turned
   * into 409 rather than leaking a raw Prisma P2002 error.
   */
  async updateProfile(userId: string, dto: UpdateUserDto): Promise<PublicUser> {
    // Reject a no-op body early so an empty PATCH doesn't bump updatedAt.
    const changed = Object.values(dto).some((v) => v !== undefined);
    if (!changed) {
      throw new ConflictException('No fields to update');
    }

    try {
      const updated = await this.prisma.user.update({
        where: { id: userId },
        // `data` is built dynamically: omitting a key means "leave it alone",
        // whereas passing undefined would be equivalent to no change anyway.
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.username !== undefined && { username: dto.username }),
          ...(dto.bio !== undefined && { bio: dto.bio }),
        },
        select: PUBLIC_USER_SELECT,
      });
      return this.toPublicUser(updated, true);
    } catch (err) {
      // P2002 is Prisma's unique-constraint violation — only possible here on
      // username, since name/bio have no constraint.
      if ((err as { code?: string }).code === 'P2002') {
        throw new ConflictException('Username already taken');
      }
      throw err;
    }
  }

  /**
   * Stores a new avatar for the caller, replacing (and deleting) any previous
   * one, and returns the updated profile.
   */
  async setAvatar(userId: string, url: string): Promise<PublicUser> {
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });
    if (!current) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: url },
      select: PUBLIC_USER_SELECT,
    });

    // After the DB points at the new file, drop the old one. Order matters:
    // deleting first would leave a window where the stored URL is dead.
    if (current.avatar) {
      await this.storage.deleteByUrl(current.avatar);
    }
    return this.toPublicUser(updated, true);
  }

  /**
   * Paginated discovery. `search` matches username OR name case-insensitively;
   * with no term it simply pages through everyone (the viewer excluded).
   */
  async search(query: SearchUsersDto, viewerId?: string): Promise<Paginated<DiscoverUser>> {
    const term = query.search?.trim();
    const where: Prisma.UserWhereInput = {
      // Never surface yourself in your own discovery feed.
      ...(viewerId && { id: { not: viewerId } }),
      ...(term && {
        OR: [
          { username: { contains: term, mode: 'insensitive' } },
          { name: { contains: term, mode: 'insensitive' } },
        ],
      }),
    };

    // Count and page in parallel: the total is needed for meta regardless.
    const [total, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        // Stable ordering: without it, repeated page requests can repeat or
        // skip rows as Postgres changes its scan plan.
        orderBy: { username: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: PUBLIC_USER_SELECT,
      }),
    ]);

    const relationships = await this.viewerRelationship(
      viewerId,
      rows.map((u) => u.id),
    );

    return paginated(
      rows.map((u) => ({
        ...this.toPublicUser(u, viewerId === u.id),
        // Relationship flags let the UI render a "Follow" button per row
        // without an extra request per user.
        ...(relationships.get(u.id) ?? { isFollowing: false, isFollowedBy: false }),
      })),
      total,
      query.page,
      query.limit,
    );
  }

  // --- helpers --------------------------------------------------------------

  /** Follower count for one user. */
  async countFollowers(userId: string): Promise<number> {
    return this.prisma.follow.count({ where: { followingId: userId } });
  }

  /** How many people this user follows. */
  async countFollowing(userId: string): Promise<number> {
    return this.prisma.follow.count({ where: { followerId: userId } });
  }

  private async countEdges(userId: string): Promise<{ followers: number; following: number }> {
    const [followers, following] = await Promise.all([
      this.countFollowers(userId),
      this.countFollowing(userId),
    ]);
    return { followers, following };
  }

  /**
   * Resolves, in ONE query, whether the viewer follows each of `userIds` and
   * whether each follows the viewer back. Doing this per row would make a
   * 20-item page issue 40 requests.
   */
  async viewerRelationship(
    viewerId: string | undefined,
    userIds: string[],
  ): Promise<Map<string, { isFollowing: boolean; isFollowedBy: boolean }>> {
    const result = new Map<string, { isFollowing: boolean; isFollowedBy: boolean }>();
    if (!viewerId || userIds.length === 0) {
      // Anonymous viewer: default every row to "no relationship".
      userIds.forEach((id) => result.set(id, { isFollowing: false, isFollowedBy: false }));
      return result;
    }

    const rows = await this.prisma.follow.findMany({
      where: {
        OR: [
          { followerId: viewerId, followingId: { in: userIds } },
          { followingId: viewerId, followerId: { in: userIds } },
        ],
      },
      select: { followerId: true, followingId: true },
    });

    userIds.forEach((id) => result.set(id, { isFollowing: false, isFollowedBy: false }));
    for (const row of rows) {
      if (row.followerId === viewerId) {
        result.set(row.followingId, {
          ...result.get(row.followingId)!,
          isFollowing: true,
        });
      } else {
        result.set(row.followerId, {
          ...result.get(row.followerId)!,
          isFollowedBy: true,
        });
      }
    }
    return result;
  }

  /** Hides email unless the viewer owns the profile. Already hash-free. */
  toPublicUser(
    user: Omit<User, 'passwordHash' | 'updatedAt'>,
    isSelf: boolean,
  ): PublicUser {
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: isSelf ? user.email : undefined,
      avatar: user.avatar,
      bio: user.bio,
      createdAt: user.createdAt,
    };
  }
}
