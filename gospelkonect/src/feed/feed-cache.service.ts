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
import { redisSafe } from '../common/redis-safe.js';

// One global counter, bumped on every write that affects any feed.
const VERSION_KEY = 'feed:home:ver';
// How long a page may be served without a recompute. Short: this is a
// read-through cache for a hot path, not a source of truth.
const TTL_SECONDS = 30;

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
   * Runs `op` with the shared Redis timeout, returning `fallback` and logging
   * rather than propagating: a cache problem is never worth failing a request
   * that could be served from Postgres.
   */
  private safe<T>(op: () => Promise<T>, fallback: T): Promise<T> {
    // Logged only when the operation actually failed — inferring failure from
    // the returned value would warn on every successful set() (which resolves
    // to undefined, the same value used as the fallback).
    return redisSafe(op, fallback, (err) =>
      this.logger.warn(`feed cache skipped: ${err.message}`),
    );
  }
}
