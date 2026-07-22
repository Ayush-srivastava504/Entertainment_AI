/*
This module fetches anime data from the Jikan API (MyAnimeList wrapper),
serving as the last-resort fallback source. It handles rate limiting and
retries, and its IDs are already MAL IDs, so no mapping is required for
database continuity.
*/

import { withRetry, RetryableError, SourcePageError } from "../lib/retry.mjs";

export const SOURCE = "jikan";
export const PAGE_SIZE = 25;
export const REQUEST_DELAY_MS = 500;

const JIKAN_BASE = "https://api.jikan.moe/v4";

function toRow(item, rank) {
  const genres = Array.isArray(item.genres) ? item.genres.map((g) => g.name).filter(Boolean) : [];
  const studios = Array.isArray(item.studios) ? item.studios.map((s) => s.name).filter(Boolean) : [];
  return {
    id: String(item.mal_id),
    title: item.title ?? "Untitled anime",
    title_english: item.title_english ?? null,
    synopsis: item.synopsis ?? null,
    poster_url: item.images?.jpg?.large_image_url ?? item.images?.jpg?.image_url ?? null,
    trailer_url: item.trailer?.url ?? null,
    year: item.year ?? item.aired?.prop?.from?.year ?? null,
    score: item.score ?? null,
    popularity: item.popularity ?? rank,
    rank: item.rank ?? null,
    episodes: item.episodes ?? null,
    status: item.status ?? null,
    type: item.type ?? null,
    genres,
    studios,
    aired_from: item.aired?.from ? item.aired.from.slice(0, 10) : null,
    aired_to: item.aired?.to ? item.aired.to.slice(0, 10) : null,
    raw: item,
    source: SOURCE,
  };
}

async function rawFetchPage(page, pageSize) {
  const url = `${JIKAN_BASE}/anime?page=${page}&limit=${pageSize}&order_by=popularity&sort=asc`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });

  if (res.status === 429) {
    const retryAfterHeader = res.headers.get("retry-after");
    throw new RetryableError("Jikan responded 429", {
      retryAfterMs: retryAfterHeader ? Number(retryAfterHeader) * 1000 : undefined,
    });
  }
  if (res.status === 504 || res.status >= 500) throw new RetryableError(`Jikan responded ${res.status}`);
  if (!res.ok) throw new Error(`Jikan request failed: ${res.status}`);
  return res.json();
}

export async function fetchPage(page, { startRank = 1 } = {}) {
  try {
    const data = await withRetry(() => rawFetchPage(page, PAGE_SIZE), {
      retries: 5,
      baseDelayMs: 500,
      label: `Jikan page ${page}`,
      isRetryable: (err) => err instanceof RetryableError,
    });

    const items = data?.data ?? [];
    const rows = items.map((item, i) => toRow(item, startRank + i));
    return { rows, hasNextPage: data?.pagination?.has_next_page ?? rows.length === PAGE_SIZE };
  } catch (err) {
    throw new SourcePageError(SOURCE, page, err);
  }
}