/**
 * Fetches movies from YTS.mx — a free, keyless movie API — used instead
 * of TMDB (which needs an API key + quota to sustain crawl volume).
 * Upserts into the `movies` table. Run every 6h (incremental) via
 * GitHub Actions, plus a deeper weekly full sync — see
 * .github/workflows/sync.yml.
 *
 *   node crawler/yts-crawler.mjs             # incremental (~20 pages, newest + top rated)
 *   node crawler/yts-crawler.mjs --full       # full (~80 pages x 3 sort orders)
 *   node crawler/yts-crawler.mjs --pages=40    # explicit page count override
 *
 * YTS has no published rate limit but this stays conservative (300ms
 * between requests) to be a good citizen and to survive transient 5xxs.
 */
import { getPool, recordSync, sleep } from "./db.mjs";

const YTS_BASE = "https://yts.mx/api/v2/list_movies.json";
const REQUEST_DELAY_MS = 300;
const PAGE_SIZE = 50; // YTS max limit

const args = process.argv.slice(2);
const isFull = args.includes("--full");
const pagesArg = args.find((a) => a.startsWith("--pages="));
const PAGES = pagesArg ? Number(pagesArg.split("=")[1]) : isFull ? 80 : 20;

// Multiple sort orders = broader coverage of YTS's catalog per crawl,
// since (unlike TMDB) there's no separate "popular/top-rated/trending"
// endpoint — it's all the same list, just sorted differently.
const SORT_ORDERS = isFull
  ? ["date_added", "rating", "download_count", "year"]
  : ["date_added", "rating"];

async function fetchYtsPage(page, sortBy, attempt = 1) {
  const url = `${YTS_BASE}?limit=${PAGE_SIZE}&page=${page}&sort_by=${sortBy}&order_by=desc`;
  const res = await fetch(url);

  if (!res.ok) {
    if (attempt > 3) {
      console.error(`  YTS page ${page} (${sortBy}) failed: ${res.status}`);
      return null;
    }
    await sleep(REQUEST_DELAY_MS * 2 ** attempt);
    return fetchYtsPage(page, sortBy, attempt + 1);
  }

  return res.json();
}

function toRow(m) {
  const genres = Array.isArray(m.genres) ? m.genres.filter(Boolean) : [];
  return {
    id: String(m.id),
    imdb_code: m.imdb_code ?? null,
    title: m.title ?? m.title_long ?? "Untitled movie",
    description: m.description_full || m.summary || null,
    poster_url: m.large_cover_image ?? m.medium_cover_image ?? null,
    background_url: m.background_image ?? null,
    trailer_url: m.yt_trailer_code ? `https://www.youtube.com/watch?v=${m.yt_trailer_code}` : null,
    year: m.year ?? null,
    score: m.rating ?? null,
    runtime: m.runtime ?? null,
    genres,
    language: m.language ?? null,
    download_count: m.download_count ?? null,
    like_count: m.like_count ?? null,
    date_uploaded: m.date_uploaded ?? null,
    raw: m,
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
        `insert into movies (id, imdb_code, title, description, poster_url, background_url, trailer_url,
                              year, score, runtime, genres, language, download_count, like_count, date_uploaded, raw, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,now())
         on conflict (id) do update set
           imdb_code = excluded.imdb_code, title = excluded.title, description = excluded.description,
           poster_url = excluded.poster_url, background_url = excluded.background_url,
           trailer_url = excluded.trailer_url, year = excluded.year, score = excluded.score,
           runtime = excluded.runtime, genres = excluded.genres, language = excluded.language,
           download_count = excluded.download_count, like_count = excluded.like_count,
           date_uploaded = excluded.date_uploaded, raw = excluded.raw, updated_at = now()`,
        [
          r.id, r.imdb_code, r.title, r.description, r.poster_url, r.background_url, r.trailer_url,
          r.year, r.score, r.runtime, r.genres, r.language, r.download_count, r.like_count, r.date_uploaded,
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
  console.log(`YTS crawl starting: ${isFull ? "FULL" : "incremental"} sync, ${PAGES} pages x ${SORT_ORDERS.length} sort orders`);
  let totalUpserted = 0;
  let totalPages = 0;

  for (const sortBy of SORT_ORDERS) {
    for (let page = 1; page <= PAGES; page++) {
      const data = await fetchYtsPage(page, sortBy);
      const movies = data?.data?.movies;
      totalPages++;

      if (!movies?.length) {
        console.log(`  [${sortBy}] page ${page}/${PAGES}: no data, moving to next sort order`);
        break;
      }

      const rows = movies.map(toRow);
      const count = await upsertBatch(rows);
      totalUpserted += count;
      console.log(`  [${sortBy}] page ${page}/${PAGES}: upserted ${count} (total ${totalUpserted})`);

      const movieCount = data?.data?.movie_count ?? Infinity;
      if (page * PAGE_SIZE >= movieCount) break;
      await sleep(REQUEST_DELAY_MS);
    }
  }

  await recordSync("yts", { pages: totalPages, rows: totalUpserted, full: isFull });
  console.log(`YTS crawl done: ${totalUpserted} movie rows upserted.`);
  await getPool().end();
}

main().catch((err) => {
  console.error("YTS crawl failed:", err);
  process.exit(1);
});
