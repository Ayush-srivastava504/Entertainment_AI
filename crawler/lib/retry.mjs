/**
 * Shared exponential-backoff retry helper for crawler sources.
 *
 * Each source module retries transient failures (network errors, 429s,
 * 5xx) internally via withRetry(). If a single page still fails after
 * exhausting retries, the caller (crawler/anime-sync.mjs) treats that as
 * one failed page — it does NOT abort the whole crawl. Only after several
 * consecutive page failures does the orchestrator demote the source and
 * fall back to the next one in the priority chain.
 */

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs fn(attempt) and retries on failure with exponential backoff + jitter.
 * fn should throw a RetryableError (or any error, if no isRetryable is given)
 * to trigger a retry; throwing anything else aborts immediately.
 */
export async function withRetry(
  fn,
  { retries = 4, baseDelayMs = 500, maxDelayMs = 20000, label = "request", isRetryable } = {}
) {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn(attempt);
    } catch (err) {
      attempt++;
      const canRetry = isRetryable ? isRetryable(err) : true;
      if (!canRetry || attempt > retries) throw err;

      // Honor Retry-After if the error carries one (set by HTTP 429/503 handlers).
      const retryAfterMs = err?.retryAfterMs;
      const backoff = retryAfterMs ?? Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const jitter = Math.floor(Math.random() * 250);
      console.warn(
        `    [retry] ${label} failed (attempt ${attempt}/${retries}): ${err.message} — backing off ${backoff + jitter}ms`
      );
      await sleep(backoff + jitter);
    }
  }
}

/** Marks an error as one that SHOULD trigger a retry (network/429/5xx). */
export class RetryableError extends Error {
  constructor(message, { retryAfterMs } = {}) {
    super(message);
    this.name = "RetryableError";
    if (retryAfterMs) this.retryAfterMs = retryAfterMs;
  }
}

/** Thrown by a source module when it gives up on a page after retries. */
export class SourcePageError extends Error {
  constructor(source, page, cause) {
    super(`${source} page ${page} failed: ${cause?.message ?? cause}`);
    this.name = "SourcePageError";
    this.source = source;
    this.page = page;
    this.cause = cause;
  }
}

export function isRetryableHttpError(err) {
  return err instanceof RetryableError;
}
