import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly redis: Redis;

  constructor(private readonly configService: ConfigService) {
    // NOTE (fix): URL comes from centralized Nest config (env.config.ts), which
    // defaults to redis://localhost:6379, instead of process.env directly.
    // Reason: the old `if (!redisUrl) throw` crashed the whole app at boot in any
    // environment missing REDIS_URL; the config default keeps every env bootable.
    const redisUrl = this.configService.get<string>(
      'redis.url',
      'redis://localhost:6379',
    );

    this.redis = new Redis(redisUrl, {
      // NOTE (decision): retry-and-queue (stay up when Redis is down; commands
      // queue until reconnect) rather than fail-fast, so a transient Redis outage
      // doesn't take the API down. maxRetriesPerRequest: null is required by
      // ioredis when queueing commands across retries.
      // To fail fast instead, use `retryStrategy: () => null` and throw on 'error'.
      maxRetriesPerRequest: null,
    });

    // NOTE (fix): ioredis emits 'error' on connection failures, and an
    // EventEmitter with no 'error' listener throws, which would crash the Node
    // process on a Redis outage. This keeps failures as logs instead of crashes.
    this.redis.on('error', (err) =>
      this.logger.error(`Redis error: ${err.message}`),
    );
    this.redis.on('ready', () => this.logger.log('Redis connected'));
  }

  // NOTE: escape hatch for advanced commands (pipelines, pub/sub) without
  // bloating this wrapper with one method per Redis command.
  getClient(): Redis {
    return this.redis;
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(
    key: string,
    value: string,
    ttl?: number,
  ): Promise<string | null> {
    if (ttl) {
      return this.redis.set(key, value, 'EX', ttl);
    }

    return this.redis.set(key, value);
  }

  async del(key: string): Promise<number> {
    return this.redis.del(key);
  }

  async exists(key: string): Promise<number> {
    return this.redis.exists(key);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.redis.expire(key, seconds);
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
