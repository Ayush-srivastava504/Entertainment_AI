/**
 * Fetches anime from Jikan (free, keyless MyAnimeList API) and upserts
 * into the `anime` table. Run every 6h (incremental) via GitHub Actions,
 * plus a deeper weekly full sync — see .github/workflows/sync.yml.
 *
 *   node crawler/jikan-crawler.mjs                 # incremental (~25 pages, most-relevant lists)
 *   node crawler/jikan-crawler.mjs --full           # full (~90 pages, entire catalog)
 *   node crawler/jikan-crawler.mjs --pages=50        # explicit page count override
 *
 * Jikan v4 rate limit is 3 req/sec and 60 req/min — this stays well
 * under that with a fixed delay + exponential backoff on 429s.
 */
import { getPool, recordSync, sleep } from "./db.mjs";

const JIKAN_BASE = "https://api.jikan.moe/v4";
const REQUEST_DELAY_MS = 500; // ~2 req/sec, safely under the 3/sec limit
const PAGE_SIZE = 25; // Jikan's max page size

const args = process.argv.slice(2);
const isFull = args.includes("--full");
const pagesArg = args.find((a) => a.startsWith("--pages="));
const PAGES = pagesArg ? Number(pagesArg.split("=")[1]) : isFull ? 90 : 25;

async function fetchJikanPage(page, attempt = 1) {
  const url = `${JIKAN_BASE}/anime?page=${page}&limit=${PAGE_SIZE}&order_by=popularity&sort=asc`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });

  if (res.status === 429) {
    if (attempt > 5) throw new Error(`Jikan rate-limited page ${page} after 5 retries`);
    const backoff = REQUEST_DELAY_MS * 2 ** attempt;
    console.warn(`  rate limited on page ${page}, backing off ${backoff}ms`);
    await sleep(backoff);
    return fetchJikanPage(page, attempt + 1);
  }

  if (!res.ok) {
    console.error(`  Jikan page ${page} failed: ${res.status}`);
    return null;
  }

  return res.json();
}

function toRow(item) {
  const genres = Array.isArray(item.genres) ? item.genres.map((g) => g.name).filter(Boolean) : [];
  const studios = Array.isArray(item.studios) ? item.studios.map((s) => s.name).filter(Boolean) : [];
  return {
    id: String(item.mal_id),
    title: item.title ?? "Untitled anime",
    title_english: item.title_english ?? null,
    synopsis: item.synopsis ?? null,
    poster_url: item.images?.jpg?.large_image_url ?? item.images?.jpg?.image_url ?? null,
    trailer_url: item.trailer?.url ?? null,
    year: item.year ?? (item.aired?.prop?.from?.year ?? null),
    score: item.score ?? null,
    popularity: item.popularity ?? null,
    rank: item.rank ?? null,
    episodes: item.episodes ?? null,
    status: item.status ?? null,
    type: item.type ?? null,
    genres,
    studios,
    aired_from: item.aired?.from ? item.aired.from.slice(0, 10) : null,
    aired_to: item.aired?.to ? item.aired.to.slice(0, 10) : null,
    raw: item,
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
        `insert into anime (id, title, title_english, synopsis, poster_url, trailer_url, year, score,
                             popularity, rank, episodes, status, type, genres, studios, aired_from, aired_to, raw, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,now())
         on conflict (id) do update set
           title = excluded.title, title_english = excluded.title_english, synopsis = excluded.synopsis,
           poster_url = excluded.poster_url, trailer_url = excluded.trailer_url, year = excluded.year,
           score = excluded.score, popularity = excluded.popularity, rank = excluded.rank,
           episodes = excluded.episodes, status = excluded.status, type = excluded.type,
           genres = excluded.genres, studios = excluded.studios, aired_from = excluded.aired_from,
           aired_to = excluded.aired_to, raw = excluded.raw, updated_at = now()`,
        [
          r.id, r.title, r.title_english, r.synopsis, r.poster_url, r.trailer_url, r.year, r.score,
          r.popularity, r.rank, r.episodes, r.status, r.type, r.genres, r.studios, r.aired_from, r.aired_to,
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
  console.log(`Jikan crawl starting: ${isFull ? "FULL" : "incremental"} sync, ${PAGES} pages (~${PAGES * PAGE_SIZE} anime)`);
  let totalUpserted = 0;

  for (let page = 1; page <= PAGES; page++) {
    const data = await fetchJikanPage(page);
    if (data?.data?.length) {
      const rows = data.data.map(toRow);
      const count = await upsertBatch(rows);
      totalUpserted += count;
      console.log(`  page ${page}/${PAGES}: upserted ${count} (total ${totalUpserted})`);
    } else {
      console.log(`  page ${page}/${PAGES}: no data, stopping early`);
      break;
    }

    if (data?.pagination?.has_next_page === false) break;
    await sleep(REQUEST_DELAY_MS);
  }

  await recordSync("jikan", { pages: PAGES, rows: totalUpserted, full: isFull });
  console.log(`Jikan crawl done: ${totalUpserted} anime upserted.`);
  await getPool().end();
}

main().catch((err) => {
  console.error("Jikan crawl failed:", err);
  process.exit(1);
});
