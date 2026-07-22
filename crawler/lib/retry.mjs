/*
This module provides shared retry utilities for crawler sources, including
exponential backoff with jitter, Retry-After header support, and custom
error types for retryable failures and source page errors.
*/

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry(
  fn,
  { retries = 4, baseDelayMs = 500, maxDelayMs = 20000, label = "request", isRetryable } = {}
) {
  let attempt = 0;
  while (true) {
    try {
      return await fn(attempt);
    } catch (err) {
      attempt++;
      const canRetry = isRetryable ? isRetryable(err) : true;
      if (!canRetry || attempt > retries) throw err;

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

export class RetryableError extends Error {
  constructor(message, { retryAfterMs } = {}) {
    super(message);
    this.name = "RetryableError";
    if (retryAfterMs) this.retryAfterMs = retryAfterMs;
  }
}

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