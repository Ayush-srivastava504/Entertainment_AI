/**
 * Optional. Backfills `poster_url` on rows the Trakt crawler left blank
 * (Trakt doesn't host images). Uses OMDb — free key from
 * https://www.omdbapi.com/apikey.aspx, 1,000 requests/day on the free
 * tier — so this only processes a bounded batch per run, prioritized by
 * whichever movies are most popular right now, and skips anything that
 * already has a poster.
 *
 *   OMDB_API_KEY=xxx node crawler/omdb-posters.mjs
 *   OMDB_API_KEY=xxx node crawler/omdb-posters.mjs --limit=500
 *
 * Safe to skip entirely: movies without a poster just render a "No
 * poster" placeholder (see app/movies/[slug]/page.tsx).
 */
import { getPool, sleep } from "./db.mjs";

const OMDB_KEY = process.env.OMDB_API_KEY;
const REQUEST_DELAY_MS = 250;

const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : 200; // stay well under the 1,000/day free quota

async function main() {
  if (!OMDB_KEY) {
    throw new Error("OMDB_API_KEY is not set. Get a free key at https://www.omdbapi.com/apikey.aspx");
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `select id, imdb_code from movies
     where poster_url is null and imdb_code is not null
     order by plays desc nulls last, watchers desc nulls last
     limit $1`,
    [LIMIT]
  );

  console.log(`Backfilling posters for ${rows.length} movies...`);
  let updated = 0;

  for (const row of rows) {
    try {
      const res = await fetch(`https://www.omdbapi.com/?i=${row.imdb_code}&apikey=${OMDB_KEY}`);
      const data = await res.json();
      if (data?.Poster && data.Poster !== "N/A") {
        await pool.query("update movies set poster_url = $1, updated_at = now() where id = $2", [data.Poster, row.id]);
        updated++;
      }
    } catch (err) {
      console.error(`  failed for ${row.imdb_code}:`, err.message);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  console.log(`Poster backfill done: ${updated}/${rows.length} updated.`);
  await pool.end();
}

main().catch((err) => {
  console.error("Poster backfill failed:", err);
  process.exit(1);
});
