/**
 * Jikan (MyAnimeList) API — LAST-RESORT fallback anime source.
 *
 * This used to be the primary source; it's kept as the final fallback
 * because it's the one most prone to 504s under load, but it's still
 * free/keyless and has full catalog coverage. Its ids ARE MAL ids, so no
 * id-mapping is needed here — this is the source the `id` column was
 * originally keyed on.
 */
import { withRetry, RetryableError, SourcePageError } from "../lib/retry.mjs";

export const SOURCE = "jikan";
export const PAGE_SIZE = 25; // Jikan's max page size
export const REQUEST_DELAY_MS = 500; // ~2 req/sec, safely under Jikan's 3/sec limit

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

/**
 * @param {number} page 1-indexed page number
 * @param {{startRank: number}} opts running popularity-rank counter (Jikan
 *   already returns its own popularity rank per item; startRank is only a
 *   fallback for items missing one)
 */
export async function fetchPage(page, { startRank = 1 } = {}) {
  try {
    const data = await withRetry(() => rawFetchPage(page, PAGE_SIZE), {
      retries: 5, // Jikan is the flakiest source (frequent 504s) — retry harder before giving up
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
