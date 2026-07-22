/**
 * Standalone manual/debug entry point for the Jikan source only.
 *
 * The scheduled crawl (.github/workflows/sync.yml, `npm run crawl:anime`)
 * uses crawler/anime-sync.mjs instead, which tries AniList first, then
 * Kitsu, and only falls back to this source last. Run this file directly
 * if you specifically want to force a Jikan-only crawl (e.g. to debug
 * Jikan itself, or backfill via it on purpose):
 *
 *   node crawler/jikan-crawler.mjs                 # incremental (~25 pages)
 *   node crawler/jikan-crawler.mjs --full          # full (~90 pages)
 *   node crawler/jikan-crawler.mjs --pages=50       # explicit page count override
 */
import { getPool, recordSync, sleep, upsertAnimeBatch } from "./db.mjs";
import * as jikan from "./sources/jikan.mjs";

const args = process.argv.slice(2);
const isFull = args.includes("--full");
const pagesArg = args.find((a) => a.startsWith("--pages="));
const PAGES = pagesArg ? Number(pagesArg.split("=")[1]) : isFull ? 90 : 25;

async function main() {
  console.log(`Jikan-only crawl starting: ${isFull ? "FULL" : "incremental"} sync, ${PAGES} pages (~${PAGES * jikan.PAGE_SIZE} anime)`);
  let totalUpserted = 0;
  let rank = 1;

  for (let page = 1; page <= PAGES; page++) {
    try {
      const { rows, hasNextPage } = await jikan.fetchPage(page, { startRank: rank });
      if (rows.length) {
        const count = await upsertAnimeBatch(rows);
        totalUpserted += count;
        rank += rows.length;
        console.log(`  page ${page}/${PAGES}: upserted ${count} (total ${totalUpserted})`);
      } else {
        console.log(`  page ${page}/${PAGES}: no data, stopping early`);
        break;
      }
      if (hasNextPage === false) break;
    } catch (err) {
      console.error(`  page ${page}/${PAGES} failed after retries: ${err.message}`);
      // Keep going — one bad page shouldn't kill the whole manual run.
    }
    await sleep(jikan.REQUEST_DELAY_MS);
  }

  await recordSync("jikan", { pages: PAGES, rows: totalUpserted, full: isFull });
  console.log(`Jikan-only crawl done: ${totalUpserted} anime upserted.`);
  await getPool().end();
}

main().catch((err) => {
  console.error("Jikan crawl failed:", err);
  process.exit(1);
});
