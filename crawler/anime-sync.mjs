/**
 * Anime catalog sync — this is what .github/workflows/sync.yml and
 * `npm run crawl:anime` actually run.
 *
 * Priority chain: AniList (primary) -> Kitsu (fallback) -> Jikan (last
 * resort, kept because it's the flakiest under load — frequent 504s —
 * but still full-coverage and free).
 *
 * Fault tolerance model:
 *   - Each source module already retries transient failures (429/5xx/
 *     network) internally with exponential backoff (crawler/lib/retry.mjs).
 *   - If a single page still fails after those retries, we log it and
 *     move on — one bad page never aborts the whole crawl.
 *   - Only after FAILURE_THRESHOLD consecutive page failures from the
 *     same source do we treat that source as "down" and demote to the
 *     next one in the chain, picking up at the same page so no anime
 *     range gets silently skipped.
 *   - All three sources normalize into the identical row shape (see
 *     crawler/sources/*.mjs), and reuse the MyAnimeList id as the primary
 *     key whenever a source can supply one — so switching sources
 *     mid-crawl (or between runs) never creates duplicate rows or changes
 *     existing /anime/[slug] URLs. The frontend and lib/api/anime.ts
 *     don't need to change at all.
 *
 *   node crawler/anime-sync.mjs                 # incremental (~25 pages)
 *   node crawler/anime-sync.mjs --full          # full (~90 pages)
 *   node crawler/anime-sync.mjs --pages=50       # explicit page count override
 */
import { getPool, recordSync, sleep, upsertAnimeBatch } from "./db.mjs";
import * as anilist from "./sources/anilist.mjs";
import * as kitsu from "./sources/kitsu.mjs";
import * as jikan from "./sources/jikan.mjs";

const SOURCE_CHAIN = [anilist, kitsu, jikan]; // priority order

const FAILURE_THRESHOLD = 3; // consecutive page failures before demoting a source

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
  let rank = 1; // running popularity rank, shared across sources for continuity
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
        // Deliberately do NOT advance `page` — the next source picks up
        // the same range so nothing gets skipped.
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
