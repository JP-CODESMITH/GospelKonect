// Shared guard for talking to Redis from a request path.
//
// RedisService is configured with maxRetriesPerRequest: null (commands queue
// instead of failing) so the API survives a Redis outage. The downside is that
// `await redis.get(...)` never settles while Redis is down — which would hang
// whatever request happened to need it. Racing every call against a short
// timeout converts "slow Redis" into "treat it as a miss" instead.

const TIMEOUT_MS = 500;

/**
 * Runs `op`, returning `fallback` on rejection, error or timeout. Never
 * throws: callers decide whether a Redis failure is worth logging, via
 * `onError`.
 */
export async function redisSafe<T>(
  op: () => Promise<T>,
  fallback: T,
  onError?: (err: Error) => void,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      op(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('redis timeout')), TIMEOUT_MS);
      }),
    ]);
  } catch (err) {
    onError?.(err as Error);
    return fallback;
  } finally {
    // Otherwise the pending timeout timer keeps the event loop alive.
    clearTimeout(timer);
  }
}
