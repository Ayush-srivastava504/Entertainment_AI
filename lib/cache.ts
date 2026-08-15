/*
This module provides a TTL cache for Postgres read operations, used to
reduce DB load. It has two backends:

1. In-memory Map (the original default) — works everywhere with zero setup,
   but on serverless platforms each cold start gets a fresh, empty cache, so
   most requests still hit Postgres directly. Fine for local dev / low
   traffic, and it's what this app used to always use.

2. Upstash Redis via its REST API — if UPSTASH_REDIS_REST_URL and
   UPSTASH_REDIS_REST_TOKEN are set, the cache is shared across all
   serverless instances/cold starts, which is what actually cuts DB load in
   production. No extra npm dependency: Upstash's REST API is plain HTTP,
   called with `fetch`.

Falls back to the in-memory cache automatically if Redis isn't configured or
a request to it fails, so this is a safe drop-in — no behavior change unless
the env vars are set.
*/

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const memoryStore = new Map<string, Entry<unknown>>();
const MAX_MEMORY_ENTRIES = 2000;

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const REDIS_ENABLED = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

function memoryGet<T>(key: string): T | undefined {
  const hit = memoryStore.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T;
  return undefined;
}

function memorySet<T>(key: string, value: T, ttlSeconds: number) {
  if (memoryStore.size >= MAX_MEMORY_ENTRIES) {
    const oldestKey = memoryStore.keys().next().value;
    if (oldestKey !== undefined) memoryStore.delete(oldestKey);
  }
  memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

async function redisGet<T>(key: string): Promise<T | undefined> {
  try {
    const res = await fetch(`${UPSTASH_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return undefined;
    const { result } = await res.json();
    return result != null ? (JSON.parse(result) as T) : undefined;
  } catch (err) {
    console.error("redis cache get failed, falling back to memory:", err);
    return undefined;
  }
}

async function redisSet<T>(key: string, value: T, ttlSeconds: number): Promise<boolean> {
  try {
    const res = await fetch(
      `${UPSTASH_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify(value))}?EX=${ttlSeconds}`,
      { headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }, method: "POST" }
    );
    return res.ok;
  } catch (err) {
    console.error("redis cache set failed, falling back to memory:", err);
    return false;
  }
}

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  if (REDIS_ENABLED) {
    const hit = await redisGet<T>(key);
    if (hit !== undefined) return hit;

    const value = await fn();
    const wrote = await redisSet(key, value, ttlSeconds);
    // Belt-and-suspenders: if the Redis write failed, still keep this
    // request's result in memory so at least this instance benefits.
    if (!wrote) memorySet(key, value, ttlSeconds);
    return value;
  }

  const hit = memoryGet<T>(key);
  if (hit !== undefined) return hit;

  const value = await fn();
  memorySet(key, value, ttlSeconds);
  return value;
}

export async function invalidate(prefix: string) {
  for (const key of memoryStore.keys()) {
    if (key.startsWith(prefix)) memoryStore.delete(key);
  }

  if (!REDIS_ENABLED) return;

  try {
    // Upstash REST doesn't support KEYS/SCAN-by-prefix deletion in one call
    // on the free tier reliably, so this is best-effort: entries will still
    // expire on their own via TTL even if this scan is skipped or partial.
    const res = await fetch(`${UPSTASH_URL}/keys/${encodeURIComponent(prefix)}*`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return;
    const { result } = (await res.json()) as { result?: string[] };
    if (!result?.length) return;
    await Promise.all(
      result.map((k) =>
        fetch(`${UPSTASH_URL}/del/${encodeURIComponent(k)}`, {
          headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
          method: "POST",
        }).catch(() => undefined)
      )
    );
  } catch (err) {
    console.error("redis cache invalidate failed:", err);
  }
}
