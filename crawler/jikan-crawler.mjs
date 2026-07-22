/*
This module is a standalone entry point for running a Jikan-only anime crawl.
It fetches pages from the Jikan API and upserts the results into the database,
useful for debugging or manual backfilling with this specific source.
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