/*
This crawler backfills cast_list (voice cast) for anime rows, one MAL id at
a time, from Jikan's /anime/{id}/characters endpoint. Deliberately separate
from anime-sync.mjs / jikan-crawler.mjs (which upsert list-page data across
three sources) because character data is only available from Jikan and only
one row at a time, so it needs its own gentler rate limit and its own
"which rows still need this" query.

No LLM involved — voice-cast names must be real, so this only ever writes
what the API actually returns.

Run standalone: `node crawler/anime-cast-crawler.mjs [--limit=60]`
*/

import { getPool, sleep } from "./db.mjs";

const args = process.argv.slice(2);
const LIMIT = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 60);
const REQUEST_DELAY_MS = 1200; // Jikan's public rate limit is tight (~1 req/1.2s is safe)
const JIKAN_BASE = "https://api.jikan.moe/v4";
const MAX_CAST = 8;

async function fetchCharacters(malId, attempt = 1) {
  const res = await fetch(`${JIKAN_BASE}/anime/${malId}/characters`);

  if (res.status === 429) {
    if (attempt > 4) throw new Error(`rate-limited after 4 retries`);
    const backoff = REQUEST_DELAY_MS * 2 ** attempt;
    console.warn(`  [anime:${malId}] rate limited, backing off ${backoff}ms`);
    await sleep(backoff);
    return fetchCharacters(malId, attempt + 1);
  }
  if (!res.ok) {
    throw new Error(`Jikan characters ${res.status}`);
  }
  return res.json();
}

// Picks the main Japanese VA for each of the top-billed characters — this is
// a voice-cast site's equivalent of a movie's top-billed cast.
function toCastList(data) {
  const rows = Array.isArray(data?.data) ? data.data : [];
  const mainCast = rows.filter((r) => r.role === "Main");
  const picked = (mainCast.length ? mainCast : rows).slice(0, MAX_CAST);

  return picked
    .map((entry) => {
      const va = (entry.voice_actors ?? []).find((v) => v.language === "Japanese") ?? entry.voice_actors?.[0];
      if (!va?.person?.name) return null;
      return {
        name: va.person.name,
        role: `${entry.character?.name ?? "Character"} (VA)`,
        photoUrl: va.person.images?.jpg?.image_url ?? null,
      };
    })
    .filter(Boolean);
}

async function main() {
  const pool = getPool();

  try {
    const { rows } = await pool.query(
      `select id from anime where cast_list is null order by popularity asc nulls last limit $1`,
      [LIMIT]
    );

    console.log(`[anime-cast] ${rows.length} row(s) queued (limit=${LIMIT})`);

    let done = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        const data = await fetchCharacters(row.id);
        const castList = toCastList(data);

        await pool.query(
          `update anime set cast_list = $1::jsonb, cast_synced_at = now() where id = $2`,
          [JSON.stringify(castList), row.id]
        );

        done++;
        console.log(`[anime-cast] id=${row.id}: ${castList.length} cast member(s) (${done}/${rows.length})`);
      } catch (err) {
        failed++;
        console.warn(`[anime-cast] skipped id=${row.id}: ${err instanceof Error ? err.message : err}`);
      }

      await sleep(REQUEST_DELAY_MS);
    }

    console.log(`[anime-cast] finished. done=${done} failed=${failed}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[anime-cast] fatal:", err);
  process.exit(1);
});
