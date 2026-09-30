// NotificationsService — the write side of the notification pipeline.
//
//   action → this service → PostgreSQL row → Redis pub/sub → (later) realtime → Flutter
//
// Persistence comes first: the row is the source of truth and survives a
// Redis outage. The publish is fire-and-forget — a dropped event only means a
// client that is *listening* misses a push, and the next inbox fetch (or the
// unread badge) still shows it.

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import type { NotificationType, Prisma } from '@prisma/client';
import { paginated, type Paginated } from '../common/pagination.js';
import { redisSafe } from '../common/redis-safe.js';
import type { PaginationDto } from '../dtos/pagination.dto.js';

// One channel per user, so a realtime gateway can subscribe to just the
// accounts it is connected to rather than fanning out every event itself.
export const NOTIFICATIONS_CHANNEL_PREFIX = 'notifications';

const ACTOR_SELECT = {
  id: true,
  name: true,
  username: true,
  avatar: true,
} satisfies Prisma.UserSelect;

const NOTIFICATION_SELECT = {
  id: true,
  type: true,
  entityType: true,
  entityId: true,
  readAt: true,
  createdAt: true,
  // The actor is embedded, not referenced: rendering "Mary mentioned you"
  // must not need a second round trip, and the recipient may not follow Mary.
  actor: { select: ACTOR_SELECT },
} satisfies Prisma.NotificationSelect;

export type NotificationResponse = Prisma.NotificationGetPayload<{
  select: typeof NOTIFICATION_SELECT;
}>;

/** Everything needed to record one event. */
export interface NotificationInput {
  userId: string;
  actorId: string;
  type: NotificationType;
  entityType?: string;
  entityId?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Records one event and publishes it. Returns the stored notification, or
   * null when it was skipped — never throws: a failed notification must not
   * roll back the action that caused it (the follow already happened).
   */
  async notify(input: NotificationInput): Promise<NotificationResponse | null> {
    // Acting on yourself is not news. (Self-follow is already blocked
    // elsewhere; self-mention in your own post is not.)
    if (input.userId === input.actorId) return null;

    try {
      const created = await this.prisma.notification.create({
        data: {
          userId: input.userId,
          actorId: input.actorId,
          type: input.type,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
        },
        select: NOTIFICATION_SELECT,
      });
      await this.publish(input.userId, created);
      return created;
    } catch (err) {
      this.logger.error(`could not record ${input.type}: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Notifies every existing account mentioned in a post. Handles that do not
   * resolve to a user are ignored rather than failing the post that mentioned
   * them — a typo should not break publishing.
   */
  async notifyMentions(postId: string, actorId: string, handles: string[]): Promise<void> {
    if (handles.length === 0) return;

    try {
      const users = await this.prisma.user.findMany({
        where: { username: { in: handles, mode: 'insensitive' } },
        select: { id: true },
      });

      for (const user of users) {
        await this.notify({
          userId: user.id,
          actorId,
          type: 'MENTION',
          entityType: 'post',
          entityId: postId,
        });
      }
    } catch (err) {
      // Runs inside PostsService.create: the post exists by now, so failing
      // here would report a 500 for a publish that already succeeded.
      this.logger.error(`mention lookup failed for ${postId}: ${(err as Error).message}`);
    }
  }

  /** The recipient's inbox, newest first. */
  async list(
    userId: string,
    query: PaginationDto,
    unreadOnly = false,
  ): Promise<Paginated<NotificationResponse>> {
    const where: Prisma.NotificationWhereInput = {
      userId,
      // readAt IS NULL — the index on (userId, readAt) serves exactly this.
      ...(unreadOnly && { readAt: null }),
    };

    const [total, rows] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: NOTIFICATION_SELECT,
      }),
    ]);

    return paginated(rows, total, query.page, query.limit);
  }

  /** The number shown on the badge — one indexed count, no pagination. */
  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  /**
   * Marks unread notifications as read and returns how many changed. Always
   * filtered by userId, so one account can never mark another's rows — and
   * re-marking an already-read row is a no-op rather than an error.
   */
  async markRead(userId: string, ids?: string[]): Promise<number> {
    const { count } = await this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
        ...(ids && ids.length > 0 && { id: { in: ids } }),
      },
      data: { readAt: new Date() },
    });
    return count;
  }

  /**
   * Drops notifications pointing at a deleted entity. Notifications are
   * polymorphic (not an FK), so orphan cleanup is the deleter's job.
   */
  async removeForEntity(entityType: string, entityId: string): Promise<void> {
    try {
      await this.prisma.notification.deleteMany({ where: { entityType, entityId } });
    } catch (err) {
      // Same reasoning as notifyMentions: the caller has already deleted the
      // entity, so an orphan cleanup failure must not become a 500.
      this.logger.error(
        `could not clean ${entityType} ${entityId} notifications: ${(err as Error).message}`,
      );
    }
  }

  // --- helpers --------------------------------------------------------------

  /**
   * Publishes on `notifications:<userId>`. Never throws: if this fails the row
   * still exists and the inbox endpoint will deliver it.
   */
  private async publish(userId: string, notification: NotificationResponse): Promise<void> {
    const payload = JSON.stringify({ userId, notification });
    await redisSafe(
      () => this.redis.getClient().publish(`${NOTIFICATIONS_CHANNEL_PREFIX}:${userId}`, payload),
      0,
      // Debug, not error: the row is already stored, so the only thing lost is
      // a push to clients that happen to be listening right now.
      (err) => this.logger.debug(`publish skipped: ${err.message}`),
    );
  }
}
