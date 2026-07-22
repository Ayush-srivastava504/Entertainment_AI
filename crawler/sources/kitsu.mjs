/**
 * Kitsu API — FALLBACK anime source, used only when AniList is failing.
 *
 * Free, keyless, JSON:API format. We pull `mappings` and `categories` as
 * sideloaded includes in the same request (no extra round-trip per anime):
 *  - mappings gives us the MyAnimeList ID when Kitsu knows it, so rows
 *    still land in the same DB row Jikan/AniList would have used.
 *  - categories gives us genre names.
 *
 * Kitsu already reports popularityRank/ratingRank directly (lower = more
 * popular), which matches the existing `anime` table's convention — no
 * rank inversion needed here, unlike AniList.
 */
import { withRetry, RetryableError, SourcePageError } from "../lib/retry.mjs";

export const SOURCE = "kitsu";
export const PAGE_SIZE = 20; // Kitsu's practical max per page
export const REQUEST_DELAY_MS = 600;

const ENDPOINT = "https://kitsu.io/api/edge/anime";

const STATUS_MAP = {
  current: "Currently Airing",
  finished: "Finished Airing",
  upcoming: "Not yet aired",
  tba: "Not yet aired",
  unreleased: "Not yet aired",
};

const TYPE_MAP = {
  TV: "TV",
  movie: "Movie",
  OVA: "OVA",
  ONA: "ONA",
  special: "Special",
  music: "Music",
};

function buildIncludedIndex(included = []) {
  const index = new Map();
  for (const item of included) index.set(`${item.type}:${item.id}`, item);
  return index;
}

function findMalId(item, includedIndex) {
  const refs = item.relationships?.mappings?.data ?? [];
  for (const ref of refs) {
    const mapping = includedIndex.get(`${ref.type}:${ref.id}`);
    if (mapping?.attributes?.externalSite === "myanimelist/anime") {
      return mapping.attributes.externalId ?? null;
    }
  }
  return null;
}

function findGenres(item, includedIndex) {
  const refs = item.relationships?.categories?.data ?? [];
  return refs
    .map((ref) => includedIndex.get(`${ref.type}:${ref.id}`)?.attributes?.title?.en)
    .filter(Boolean);
}

function toRow(item, includedIndex, rank) {
  const a = item.attributes;
  const malId = findMalId(item, includedIndex);
  const id = malId ? String(malId) : `ki-${item.id}`;
  const title = a.titles?.en || a.titles?.en_jp || a.canonicalTitle || "Untitled anime";

  return {
    id,
    title,
    title_english: a.titles?.en ?? null,
    synopsis: a.synopsis ? a.synopsis.replace(/\s+/g, " ").trim() : null,
    poster_url: a.posterImage?.large ?? a.posterImage?.original ?? null,
    trailer_url: a.youtubeVideoId ? `https://www.youtube.com/watch?v=${a.youtubeVideoId}` : null,
    year: a.startDate ? Number(a.startDate.slice(0, 4)) : null,
    score: typeof a.averageRating === "string" || typeof a.averageRating === "number"
      ? Math.round((parseFloat(a.averageRating) / 10) * 10) / 10
      : null,
    popularity: a.popularityRank ?? rank,
    rank: a.ratingRank ?? null,
    episodes: a.episodeCount ?? null,
    status: STATUS_MAP[a.status] ?? a.status ?? null,
    type: TYPE_MAP[a.subtype] ?? a.subtype ?? null,
    genres: findGenres(item, includedIndex),
    studios: [], // not sideloaded — not worth another include for a fallback-only path
    aired_from: a.startDate ?? null,
    aired_to: a.endDate ?? null,
    raw: item,
    source: SOURCE,
  };
}

async function rawFetchPage(page, pageSize) {
  const offset = (page - 1) * pageSize;
  const params = new URLSearchParams({
    "page[limit]": String(pageSize),
    "page[offset]": String(offset),
    sort: "-userCount",
    include: "mappings,categories",
  });
  const res = await fetch(`${ENDPOINT}?${params.toString()}`, { headers: { Accept: "application/vnd.api+json" } });

  if (res.status === 429 || res.status === 503) {
    const retryAfterHeader = res.headers.get("retry-after");
    throw new RetryableError(`Kitsu responded ${res.status}`, {
      retryAfterMs: retryAfterHeader ? Number(retryAfterHeader) * 1000 : undefined,
    });
  }
  if (res.status >= 500) throw new RetryableError(`Kitsu responded ${res.status}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Kitsu request failed: ${res.status} ${body.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * @param {number} page 1-indexed page number
 * @param {{startRank: number}} opts running popularity-rank counter (used only
 *   as a fallback when a given anime has no popularityRank of its own)
 */
export async function fetchPage(page, { startRank = 1 } = {}) {
  try {
    const json = await withRetry(() => rawFetchPage(page, PAGE_SIZE), {
      retries: 4,
      baseDelayMs: 800,
      label: `Kitsu page ${page}`,
      isRetryable: (err) => err instanceof RetryableError,
    });

    const includedIndex = buildIncludedIndex(json.included);
    const items = json.data ?? [];
    const rows = items.map((item, i) => toRow(item, includedIndex, startRank + i));
    const hasNextPage = Boolean(json.links?.next);
    return { rows, hasNextPage };
  } catch (err) {
    throw new SourcePageError(SOURCE, page, err);
  }
}
