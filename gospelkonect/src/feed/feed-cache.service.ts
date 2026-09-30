// FeedCacheService — short-TTL Redis cache for home-feed pages.
//
// Invalidation model: ONE global version counter. Any write that changes what
// a feed could show (post created/edited/deleted, follow/unfollow) bumps it,
// which changes the key of every cached page. Old keys are then just orphaned
// until their TTL sweeps them — no need to enumerate per-user cursor variants.
//
// Every Redis call is wrapped: a slow or broken Redis must degrade to a cache
// miss, never to a hung or failed feed request.

import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service.js';

// One global counter, bumped on every write that affects any feed.
const VERSION_KEY = 'feed:home:ver';
// How long a page may be served without a recompute. Short: this is a
// read-through cache for a hot path, not a source of truth.
const TTL_SECONDS = 30;
// An ioredis client configured with maxRetriesPerRequest: null queues commands
// forever while Redis is down, so a timeout is the only way to stop a feed
// request from hanging on a dead connection.
const REDIS_TIMEOUT_MS = 500;

@Injectable()
export class FeedCacheService {
  private readonly logger = new Logger(FeedCacheService.name);

  constructor(private readonly redis: RedisService) {}

  /** Reads a cached page. Returns null on a miss, error or timeout. */
  async get(userId: string, pageKey: string): Promise<string | null> {
    return this.safe(async () => {
      const version = await this.version();
      return this.redis.get(this.key(version, userId, pageKey));
    }, null);
  }

  /** Stores a page for TTL_SECONDS. Never throws. */
  async set(userId: string, pageKey: string, payload: string): Promise<void> {
    await this.safe(async () => {
      const version = await this.version();
      await this.redis.set(this.key(version, userId, pageKey), payload, TTL_SECONDS);
    }, undefined);
  }

  /** Called after any write that changes feed contents. Never throws. */
  async invalidate(): Promise<void> {
    await this.safe(async () => {
      // incr creates the counter on first use, so there is no bootstrap race.
      await this.redis.getClient().incr(VERSION_KEY);
    }, undefined);
  }

  // --- helpers --------------------------------------------------------------

  private key(version: string, userId: string, pageKey: string): string {
    // Version in the middle: bumping it invalidates every user's every page
    // in one operation, while keys stay per-user (no cross-user data sharing).
    return `feed:home:${version}:${userId}:${pageKey}`;
  }

  private async version(): Promise<string> {
    // '0' before the first invalidation — a valid, stable version.
    return (await this.redis.get(VERSION_KEY)) ?? '0';
  }

  /**
   * Runs `op` with a timeout, returning `fallback` on rejection, error or
   * timeout, and logs rather than propagating: a cache problem is never worth
   * failing a request that could be served from Postgres.
   */
  private async safe<T>(op: () => Promise<T>, fallback: T): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        op(),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error('redis timeout')), REDIS_TIMEOUT_MS);
        }),
      ]);
    } catch (err) {
      this.logger.warn(`feed cache skipped: ${(err as Error).message}`);
      return fallback;
    } finally {
      // Without this the timeout timer would keep the event loop alive.
      clearTimeout(timer);
    }
  }
}
