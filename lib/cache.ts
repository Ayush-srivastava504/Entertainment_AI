/**
 * Tiny in-memory TTL cache in front of Postgres reads.
 *
 * Serverless functions reuse warm instances between requests, so this
 * still cuts a meaningful amount of DB load even without an external
 * cache — and it means the app has zero extra infra to provision.
 *
 * Want real cross-instance caching (Redis/Upstash)? Swap the body of
 * `cached()` for a GET/SET against your Redis client — every call site
 * in lib/api/anime.ts and lib/api/movies.ts stays the same.
 */

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

// Keep the process from leaking memory if it stays warm a long time.
const MAX_ENTRIES = 2000;

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.value as T;
  }

  const value = await fn();

  if (store.size >= MAX_ENTRIES) {
    const oldestKey = store.keys().next().value;
    if (oldestKey !== undefined) store.delete(oldestKey);
  }
  store.set(key, { value, expiresAt: now + ttlSeconds * 1000 });

  return value;
}

export function invalidate(prefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
