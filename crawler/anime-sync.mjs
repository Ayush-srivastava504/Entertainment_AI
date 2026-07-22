/*
This module synchronizes the anime catalog by fetching data from multiple
sources in priority order (AniList -> Kitsu -> Jikan). It handles failures
gracefully, demoting sources after consecutive failures and continuing
with the next available source.
*/

import { getPool, recordSync, sleep, upsertAnimeBatch } from "./db.mjs";
import * as anilist from "./sources/anilist.mjs";
import * as kitsu from "./sources/kitsu.mjs";
import * as jikan from "./sources/jikan.mjs";

const SOURCE_CHAIN = [anilist, kitsu, jikan];

const FAILURE_THRESHOLD = 3;

const args = process.argv.slice(2);
const isFull = args.includes("--full");
const pagesArg = args.find((a) => a.startsWith("--pages="));
const TOTAL_PAGES = pagesArg ? Number(pagesArg.split("=")[1]) : isFull ? 90 : 25;

async function main() {
  console.log(
    `Anime sync starting: ${isFull ? "FULL" : "incremental"}, up to ${TOTAL_PAGES} pages. ` +
      `Priority: ${SOURCE_CHAIN.map((s) => s.SOURCE).join(" -> ")}`
  );

  let sourceIdx = 0;
  let consecutiveFailures = 0;
  let totalUpserted = 0;
  let page = 1;
  let rank = 1;
  const usage = Object.fromEntries(SOURCE_CHAIN.map((s) => [s.SOURCE, { pages: 0, rows: 0 }]));

  while (page <= TOTAL_PAGES && sourceIdx < SOURCE_CHAIN.length) {
    const source = SOURCE_CHAIN[sourceIdx];
    try {
      const { rows, hasNextPage } = await source.fetchPage(page, { startRank: rank });

      if (rows.length) {
        const count = await upsertAnimeBatch(rows);
        totalUpserted += count;
        rank += rows.length;
        usage[source.SOURCE].pages += 1;
        usage[source.SOURCE].rows += count;
        console.log(`  [${source.SOURCE}] page ${page}/${TOTAL_PAGES}: upserted ${count} (total ${totalUpserted})`);
      } else {
        console.log(`  [${source.SOURCE}] page ${page}/${TOTAL_PAGES}: no data`);
      }

      consecutiveFailures = 0;
      page += 1;

      if (hasNextPage === false && !isFull) {
        console.log(`  [${source.SOURCE}] reached end of available pages, stopping.`);
        break;
      }
      await sleep(source.REQUEST_DELAY_MS ?? 500);
    } catch (err) {
      consecutiveFailures += 1;
      console.error(`  [${source.SOURCE}] page ${page} failed (${consecutiveFailures}/${FAILURE_THRESHOLD}): ${err.message}`);

      if (consecutiveFailures >= FAILURE_THRESHOLD) {
        const next = SOURCE_CHAIN[sourceIdx + 1];
        console.warn(
          `  [${source.SOURCE}] unreliable after ${consecutiveFailures} consecutive failures — ` +
            (next ? `falling back to ${next.SOURCE} starting at page ${page}.` : "no fallback left, stopping crawl.")
        );
        sourceIdx += 1;
        consecutiveFailures = 0;
      } else {
        await sleep(1000);
      }
    }
  }

  if (sourceIdx >= SOURCE_CHAIN.length) {
    console.error("All anime sources are down for this run — stopping early. Will retry fresh next scheduled run.");
  }

  await recordSync("anime", { pages: page - 1, rows: totalUpserted, full: isFull, details: usage });
  console.log(`Anime sync done: ${totalUpserted} upserted.`, usage);
  await getPool().end();
}

main().catch((err) => {
  console.error("Anime sync failed:", err);
  process.exit(1);
});