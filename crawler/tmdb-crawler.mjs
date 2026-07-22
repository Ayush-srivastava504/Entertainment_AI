/**
 * Fetches movies from TMDB (The Movie Database) — api.themoviedb.org — and
 * upserts into the `movies` table. Requires a free TMDB_API_READ_ACCESS_TOKEN
 * (the v4 "Read Access Token", a long JWT-looking string, NOT the shorter
 * v3 API key): https://www.themoviedb.org/settings/api → copy "API Read
 * Access Token". Self-serve signup, no approval wait.
 *
 * TMDB also hosts poster/backdrop images directly, so unlike the old Trakt
 * setup there's no separate poster-backfill step — posters and backdrops
 * are populated in this same pass.
 *
 * Run every 6h (incremental) via GitHub Actions, plus a deeper weekly
 * full sync — see .github/workflows/sync.yml.
 *
 *   TMDB_API_READ_ACCESS_TOKEN=xxx node crawler/tmdb-crawler.mjs             # incremental (~5 pages/list)
 *   TMDB_API_READ_ACCESS_TOKEN=xxx node crawler/tmdb-crawler.mjs --full      # full (~20 pages/list)
 *   TMDB_API_READ_ACCESS_TOKEN=xxx node crawler/tmdb-crawler.mjs --pages=10  # explicit override
 *   TMDB_API_READ_ACCESS_TOKEN=xxx node crawler/tmdb-crawler.mjs --no-details # skip per-movie detail enrichment (faster)
 */
import { getPool, recordSync, sleep } from "./db.mjs";

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p";
const TOKEN = process.env.TMDB_API_READ_ACCESS_TOKEN;
const REQUEST_DELAY_MS = 250;
const PAGE_SIZE = 20; // fixed by TMDB

const args = process.argv.slice(2);
const isFull = args.includes("--full");
const withDetails = !args.includes("--no-details");
const pagesArg = args.find((a) => a.startsWith("--pages="));
const PAGES = pagesArg ? Number(pagesArg.split("=")[1]) : isFull ? 20 : 5;

// list = TMDB endpoint, statKey = which column this list's ordering feeds
// (TMDB has no exact equivalent of Trakt's watchers/plays/list_count, so
// we map its closest popularity/demand signals onto those same columns —
// this keeps the `movies` table schema and lib/api/movies.ts unchanged).
const LISTS = [
  { path: "trending/movie/week", statKey: "watchers" },
  { path: "movie/popular", statKey: "plays" },
  { path: "movie/upcoming", statKey: "list_count" },
  { path: "movie/top_rated", statKey: null },
];

function authHeaders() {
  return {
    accept: "application/json",
    Authorization: `Bearer ${TOKEN}`,
  };
}

async function tmdbFetch(path, attempt = 1) {
  const url = `${TMDB_BASE}${path}`;
  const res = await fetch(url, { headers: authHeaders() });

  if (res.status === 429) {
    if (attempt > 5) throw new Error(`TMDB rate-limited ${path} after 5 retries`);
    const backoff = REQUEST_DELAY_MS * 2 ** attempt;
    console.warn(`  rate limited on ${path}, backing off ${backoff}ms`);
    await sleep(backoff);
    return tmdbFetch(path, attempt + 1);
  }

  if (!res.ok) {
    console.error(`  TMDB ${path} failed: ${res.status}`);
    return null;
  }

  return res.json();
}

async function fetchGenreMap() {
  const data = await tmdbFetch("/genre/movie/list?language=en-US");
  const map = new Map();
  for (const g of data?.genres ?? []) map.set(g.id, g.name);
  return map;
}

function posterUrl(path) {
  return path ? `${IMG_BASE}/w500${path}` : null;
}

function backgroundUrl(path) {
  return path ? `${IMG_BASE}/original${path}` : null;
}

function toRow(movie, statKey, genreMap, detail) {
  const genres = Array.isArray(movie.genre_ids)
    ? movie.genre_ids.map((id) => genreMap.get(id)).filter(Boolean)
    : Array.isArray(detail?.genres)
      ? detail.genres.map((g) => g.name)
      : [];

  const trailer = detail?.videos?.results?.find(
    (v) => v.site === "YouTube" && v.type === "Trailer"
  );

  const row = {
    id: String(movie.id),
    imdb_code: detail?.external_ids?.imdb_id ?? null,
    tmdb_id: String(movie.id),
    slug: null,
    title: movie.title ?? movie.name ?? "Untitled movie",
    tagline: detail?.tagline || null,
    description: movie.overview ?? null,
    poster_url: posterUrl(movie.poster_path),
    background_url: backgroundUrl(movie.backdrop_path),
    trailer_url: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
    year: movie.release_date ? Number(movie.release_date.slice(0, 4)) : null,
    score: movie.vote_average ?? null,
    runtime: detail?.runtime ?? null,
    genres,
    language: movie.original_language ?? null,
    released_at: movie.release_date || null,
    raw: movie,
  };

  row.watchers = statKey === "watchers" ? Math.round(movie.popularity ?? 0) : null;
  row.plays = statKey === "plays" ? Math.round(movie.popularity ?? 0) : null;
  row.list_count = statKey === "list_count" ? Math.round(movie.popularity ?? 0) : null;

  return row;
}

async function upsertBatch(rows) {
  if (rows.length === 0) return 0;
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    for (const r of rows) {
      await client.query(
        `insert into movies (id, imdb_code, tmdb_id, slug, title, tagline, description, poster_url, background_url,
                              trailer_url, year, score, runtime, genres, language, watchers, plays, list_count,
                              released_at, raw, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,now())
         on conflict (id) do update set
           imdb_code = coalesce(excluded.imdb_code, movies.imdb_code), tmdb_id = excluded.tmdb_id, slug = excluded.slug,
           title = excluded.title, tagline = coalesce(excluded.tagline, movies.tagline), description = excluded.description,
           poster_url = coalesce(excluded.poster_url, movies.poster_url), background_url = coalesce(excluded.background_url, movies.background_url),
           trailer_url = coalesce(excluded.trailer_url, movies.trailer_url),
           year = excluded.year, score = excluded.score,
           runtime = coalesce(excluded.runtime, movies.runtime), genres = excluded.genres, language = excluded.language,
           -- stats only come from one list at a time; don't let a pass that lacks a
           -- given stat (e.g. /top_rated has no assigned stat) null out a value another pass set
           watchers = coalesce(excluded.watchers, movies.watchers),
           plays = coalesce(excluded.plays, movies.plays),
           list_count = coalesce(excluded.list_count, movies.list_count),
           released_at = excluded.released_at, raw = excluded.raw, updated_at = now()`,
        [
          r.id, r.imdb_code, r.tmdb_id, r.slug, r.title, r.tagline, r.description, r.poster_url, r.background_url,
          r.trailer_url, r.year, r.score, r.runtime, r.genres, r.language, r.watchers, r.plays, r.list_count,
          r.released_at, JSON.stringify(r.raw),
        ]
      );
    }
    await client.query("commit");
    return rows.length;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

async function main() {
  if (!TOKEN) {
    throw new Error(
      "TMDB_API_READ_ACCESS_TOKEN is not set. Get a free one at " +
        "https://www.themoviedb.org/settings/api (copy the 'API Read Access Token', not the API key)."
    );
  }

  console.log(
    `TMDB crawl starting: ${isFull ? "FULL" : "incremental"} sync, ${PAGES} pages x ${LISTS.length} lists` +
      (withDetails ? " (with detail enrichment)" : " (list data only)")
  );

  const genreMap = await fetchGenreMap();
  const detailCache = new Map(); // tmdb id -> detail payload, avoids re-fetching movies shared across lists
  let totalUpserted = 0;

  for (const list of LISTS) {
    for (let page = 1; page <= PAGES; page++) {
      const data = await tmdbFetch(`/${list.path}?language=en-US&page=${page}`);
      await sleep(REQUEST_DELAY_MS);

      const results = data?.results ?? [];
      if (results.length === 0) {
        console.log(`  [${list.path}] page ${page}/${PAGES}: no data, moving to next list`);
        break;
      }

      const rows = [];
      for (const movie of results) {
        let detail = null;
        if (withDetails) {
          if (detailCache.has(movie.id)) {
            detail = detailCache.get(movie.id);
          } else {
            detail = await tmdbFetch(`/movie/${movie.id}?append_to_response=external_ids,videos`);
            detailCache.set(movie.id, detail);
            await sleep(REQUEST_DELAY_MS);
          }
        }
        rows.push(toRow(movie, list.statKey, genreMap, detail));
      }

      const count = await upsertBatch(rows);
      totalUpserted += count;
      console.log(`  [${list.path}] page ${page}/${PAGES}: upserted ${count} (total ${totalUpserted})`);

      if (results.length < PAGE_SIZE || page >= (data?.total_pages ?? Infinity)) break; // last page
    }
  }

  await recordSync("tmdb", { pages: PAGES * LISTS.length, rows: totalUpserted, full: isFull });
  console.log(`TMDB crawl done: ${totalUpserted} movie rows upserted.`);
  await getPool().end();
}

main().catch((err) => {
  console.error("TMDB crawl failed:", err);
  process.exit(1);
});
