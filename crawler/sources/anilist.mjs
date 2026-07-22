/*
This module fetches anime data from the AniList GraphQL API, normalizing
it into the application's database schema. It handles rate limiting,
retries, and ID mapping to ensure continuity with existing data from
other sources like Jikan.
*/

import { withRetry, RetryableError, SourcePageError } from "../lib/retry.mjs";

export const SOURCE = "anilist";
export const PAGE_SIZE = 25;
export const REQUEST_DELAY_MS = 1500;

const ENDPOINT = "https://graphql.anilist.co";

const QUERY = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage }
    media(type: ANIME, sort: POPULARITY_DESC) {
      id
      idMal
      title { romaji english }
      description(asHtml: false)
      coverImage { extraLarge large }
      trailer { id site }
      averageScore
      episodes
      status
      format
      genres
      studios(isMain: true) { nodes { name } }
      startDate { year month day }
      endDate { year month day }
      seasonYear
    }
  }
}`;

const STATUS_MAP = {
  FINISHED: "Finished Airing",
  RELEASING: "Currently Airing",
  NOT_YET_RELEASED: "Not yet aired",
  CANCELLED: "Cancelled",
  HIATUS: "On Hiatus",
};

const FORMAT_MAP = {
  TV: "TV",
  TV_SHORT: "TV",
  MOVIE: "Movie",
  SPECIAL: "Special",
  OVA: "OVA",
  ONA: "ONA",
  MUSIC: "Music",
};

function ymd(d) {
  if (!d?.year) return null;
  const mm = String(d.month ?? 1).padStart(2, "0");
  const dd = String(d.day ?? 1).padStart(2, "0");
  return `${d.year}-${mm}-${dd}`;
}

function stripHtml(s) {
  return s ? s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : null;
}

function toRow(m, rank) {
  const id = m.idMal ? String(m.idMal) : `al-${m.id}`;
  return {
    id,
    title: m.title?.english || m.title?.romaji || "Untitled anime",
    title_english: m.title?.english ?? null,
    synopsis: stripHtml(m.description),
    poster_url: m.coverImage?.extraLarge ?? m.coverImage?.large ?? null,
    trailer_url: m.trailer?.site === "youtube" && m.trailer?.id ? `https://www.youtube.com/watch?v=${m.trailer.id}` : null,
    year: m.seasonYear ?? m.startDate?.year ?? null,
    score: typeof m.averageScore === "number" ? Math.round(m.averageScore) / 10 : null,
    popularity: rank,
    rank: null,
    episodes: m.episodes ?? null,
    status: STATUS_MAP[m.status] ?? m.status ?? null,
    type: FORMAT_MAP[m.format] ?? m.format ?? null,
    genres: Array.isArray(m.genres) ? m.genres : [],
    studios: Array.isArray(m.studios?.nodes) ? m.studios.nodes.map((s) => s.name).filter(Boolean) : [],
    aired_from: ymd(m.startDate),
    aired_to: ymd(m.endDate),
    raw: m,
    source: SOURCE,
  };
}

async function rawFetchPage(page, pageSize) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { page, perPage: pageSize } }),
  });

  if (res.status === 429 || res.status === 503) {
    const retryAfterHeader = res.headers.get("retry-after");
    const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : undefined;
    throw new RetryableError(`AniList responded ${res.status}`, { retryAfterMs });
  }
  if (res.status >= 500) throw new RetryableError(`AniList responded ${res.status}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AniList request failed: ${res.status} ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    const msg = json.errors.map((e) => e.message).join("; ");
    if (/rate limit/i.test(msg)) throw new RetryableError(`AniList rate limited: ${msg}`);
    throw new Error(`AniList GraphQL error: ${msg}`);
  }
  return json.data.Page;
}

export async function fetchPage(page, { startRank = 1 } = {}) {
  try {
    const data = await withRetry(() => rawFetchPage(page, PAGE_SIZE), {
      retries: 4,
      baseDelayMs: 1000,
      label: `AniList page ${page}`,
      isRetryable: (err) => err instanceof RetryableError,
    });

    const rows = (data.media ?? []).map((m, i) => toRow(m, startRank + i));
    return { rows, hasNextPage: data.pageInfo?.hasNextPage ?? rows.length === PAGE_SIZE };
  } catch (err) {
    throw new SourcePageError(SOURCE, page, err);
  }
}