/**
 * Fetches movies from Trakt.tv — a legitimate media-tracking API, not a
 * torrent index — and upserts into the `movies` table. Requires a free
 * TRAKT_CLIENT_ID: https://trakt.tv/oauth/applications → New Application
 * (name it anything, redirect URI can be urn:ietf:wg:oauth:2.0:oob).
 * That's a self-serve signup, no approval wait.
 *
 * Run every 6h (incremental) via GitHub Actions, plus a deeper weekly
 * full sync — see .github/workflows/sync.yml.
 *
 *   TRAKT_CLIENT_ID=xxx node crawler/trakt-crawler.mjs             # incremental (~5 pages/list)
 *   TRAKT_CLIENT_ID=xxx node crawler/trakt-crawler.mjs --full       # full (~20 pages/list)
 *   TRAKT_CLIENT_ID=xxx node crawler/trakt-crawler.mjs --pages=10    # explicit override
 *
 * Trakt doesn't host poster art — run crawler/omdb-posters.mjs after
 * this (optional, needs a free OMDb key) to backfill posters.
 */
import { getPool, recordSync, sleep } from "./db.mjs";

const TRAKT_BASE = "https://api.trakt.tv";
const CLIENT_ID = process.env.TRAKT_CLIENT_ID;
const REQUEST_DELAY_MS = 300;
const PAGE_SIZE = 100; // Trakt max page size

const args = process.argv.slice(2);
const isFull = args.includes("--full");
const pagesArg = args.find((a) => a.startsWith("--pages="));
const PAGES = pagesArg ? Number(pagesArg.split("=")[1]) : isFull ? 20 : 5;

// list = Trakt endpoint, wrap = how to pull {movie, stats} out of each item
const LISTS = [
  { path: "movies/trending", wrap: (item) => ({ movie: item.movie, stats: { watchers: item.watchers } }) },
  { path: "movies/popular", wrap: (item) => ({ movie: item, stats: {} }) },
  { path: "movies/anticipated", wrap: (item) => ({ movie: item.movie, stats: { list_count: item.list_count } }) },
  { path: "movies/played/weekly", wrap: (item) => ({ movie: item.movie, stats: { plays: item.play_count } }) },
];

async function fetchTraktPage(path, page, attempt = 1) {
  const url = `${TRAKT_BASE}/${path}?page=${page}&limit=${PAGE_SIZE}&extended=full`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      "trakt-api-version": "2",
      "trakt-api-key": CLIENT_ID,
    },
  });

  if (res.status === 429) {
    if (attempt > 5) throw new Error(`Trakt rate-limited ${path} page ${page} after 5 retries`);
    const backoff = REQUEST_DELAY_MS * 2 ** attempt;
    console.warn(`  rate limited on ${path} page ${page}, backing off ${backoff}ms`);
    await sleep(backoff);
    return fetchTraktPage(path, page, attempt + 1);
  }

  if (!res.ok) {
    console.error(`  Trakt ${path} page ${page} failed: ${res.status}`);
    return null;
  }

  return res.json();
}

function toRow(movie, stats) {
  return {
    id: String(movie.ids.trakt),
    imdb_code: movie.ids.imdb ?? null,
    tmdb_id: movie.ids.tmdb ? String(movie.ids.tmdb) : null,
    slug: movie.ids.slug ?? null,
    title: movie.title ?? "Untitled movie",
    tagline: movie.tagline ?? null,
    description: movie.overview ?? null,
    trailer_url: movie.trailer ?? null,
    year: movie.year ?? null,
    score: movie.rating ?? null,
    runtime: movie.runtime ?? null,
    genres: Array.isArray(movie.genres) ? movie.genres : [],
    language: movie.language ?? null,
    watchers: stats.watchers ?? null,
    plays: stats.plays ?? null,
    list_count: stats.list_count ?? null,
    released_at: movie.released ?? null,
    raw: movie,
  };
}

async function upsertBatch(rows) {
  if (rows.length === 0) return 0;
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    for (const r of rows) {
      await client.query(
        `insert into movies (id, imdb_code, tmdb_id, slug, title, tagline, description, trailer_url,
                              year, score, runtime, genres, language, watchers, plays, list_count, released_at, raw, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,now())
         on conflict (id) do update set
           imdb_code = excluded.imdb_code, tmdb_id = excluded.tmdb_id, slug = excluded.slug,
           title = excluded.title, tagline = excluded.tagline, description = excluded.description,
           trailer_url = excluded.trailer_url, year = excluded.year, score = excluded.score,
           runtime = excluded.runtime, genres = excluded.genres, language = excluded.language,
           -- stats only come from one list at a time; don't let a pass that lacks a
           -- given stat (e.g. /popular has no watchers) null out a value another pass set
           watchers = coalesce(excluded.watchers, movies.watchers),
           plays = coalesce(excluded.plays, movies.plays),
           list_count = coalesce(excluded.list_count, movies.list_count),
           released_at = excluded.released_at, raw = excluded.raw, updated_at = now()`,
        [
          r.id, r.imdb_code, r.tmdb_id, r.slug, r.title, r.tagline, r.description, r.trailer_url,
          r.year, r.score, r.runtime, r.genres, r.language, r.watchers, r.plays, r.list_count, r.released_at,
          JSON.stringify(r.raw),
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
  if (!CLIENT_ID) {
    throw new Error(
      "TRAKT_CLIENT_ID is not set. Get a free one at https://trakt.tv/oauth/applications " +
        "(New Application → any name → redirect URI urn:ietf:wg:oauth:2.0:oob)."
    );
  }

  console.log(`Trakt crawl starting: ${isFull ? "FULL" : "incremental"} sync, ${PAGES} pages x ${LISTS.length} lists`);
  let totalUpserted = 0;

  for (const list of LISTS) {
    for (let page = 1; page <= PAGES; page++) {
      const data = await fetchTraktPage(list.path, page);
      if (!Array.isArray(data) || data.length === 0) {
        console.log(`  [${list.path}] page ${page}/${PAGES}: no data, moving to next list`);
        break;
      }

      const rows = data
        .map((item) => list.wrap(item))
        .filter((x) => x.movie?.ids?.trakt)
        .map((x) => toRow(x.movie, x.stats));

      const count = await upsertBatch(rows);
      totalUpserted += count;
      console.log(`  [${list.path}] page ${page}/${PAGES}: upserted ${count} (total ${totalUpserted})`);

      if (data.length < PAGE_SIZE) break; // last page
      await sleep(REQUEST_DELAY_MS);
    }
  }

  await recordSync("trakt", { pages: PAGES * LISTS.length, rows: totalUpserted, full: isFull });
  console.log(`Trakt crawl done: ${totalUpserted} movie rows upserted.`);
  if (!process.env.OMDB_API_KEY) {
    console.log("Tip: set OMDB_API_KEY and run `npm run crawl:posters` to backfill poster art (optional, free key).");
  }
  await getPool().end();
}

main().catch((err) => {
  console.error("Trakt crawl failed:", err);
  process.exit(1);
});
