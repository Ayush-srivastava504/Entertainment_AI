/*
This module enriches already-crawled movies with "where to watch" streaming
data from TMDB's free watch/providers endpoint. It runs after the main TMDB
crawler (movies must already exist in the DB) and fills in movies.watch_providers
with a small normalized shape: { region, link, flatrate: [...], rent: [...], buy: [...] }
where each provider entry is { name, logo }.

Only a bounded batch of movies is refreshed per run (oldest-enriched first)
to stay well inside TMDB's rate limits — run it as often as the main sync.
*/

import { getPool, sleep } from "./db.mjs";

const TMDB_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/original";
const TOKEN = process.env.TMDB_API_READ_ACCESS_TOKEN;
const REQUEST_DELAY_MS = 250;

// Region to surface as the primary "where to watch" block. Falls back to US
// if a title has no providers listed for this region yet.
const PRIMARY_REGION = process.env.WATCH_PROVIDERS_REGION || "IN";
const FALLBACK_REGION = "US";

const args = process.argv.slice(2);
const batchArg = args.find((a) => a.startsWith("--batch="));
const BATCH_SIZE = batchArg ? Number(batchArg.split("=")[1]) : 150;

function authHeaders() {
  return { accept: "application/json", Authorization: `Bearer ${TOKEN}` };
}

async function fetchProviders(tmdbId, attempt = 1) {
  const res = await fetch(`${TMDB_BASE}/movie/${tmdbId}/watch/providers`, { headers: authHeaders() });
  if (res.status === 429) {
    if (attempt > 5) throw new Error(`rate-limited on movie ${tmdbId} after 5 retries`);
    const backoff = REQUEST_DELAY_MS * 2 ** attempt;
    await sleep(backoff);
    return fetchProviders(tmdbId, attempt + 1);
  }
  if (!res.ok) {
    console.warn(`  watch-providers: TMDB ${tmdbId} failed (${res.status})`);
    return null;
  }
  return res.json();
}

function normalizeRegion(regionBlock) {
  if (!regionBlock) return null;
  const pick = (key) =>
    (regionBlock[key] ?? []).map((p) => ({ name: p.provider_name, logo: p.logo_path ? `${IMG_BASE}${p.logo_path}` : null }));
  return {
    link: regionBlock.link ?? null,
    flatrate: pick("flatrate"),
    rent: pick("rent"),
    buy: pick("buy"),
  };
}

async function main() {
  if (!TOKEN) {
    console.error("watch-providers: TMDB_API_READ_ACCESS_TOKEN is not set, skipping run.");
    return;
  }

  const pool = getPool();
  const { rows: movies } = await pool.query(
    `select id from movies
     order by watch_providers_synced_at asc nulls first
     limit $1`,
    [BATCH_SIZE]
  );

  if (movies.length === 0) {
    console.log("watch-providers: no movies in the catalog yet, nothing to do.");
    return;
  }

  let updated = 0;
  for (const { id } of movies) {
    try {
      const data = await fetchProviders(id);
      const results = data?.results ?? {};
      const regionBlock = results[PRIMARY_REGION] ?? results[FALLBACK_REGION] ?? null;
      const normalized = {
        region: results[PRIMARY_REGION] ? PRIMARY_REGION : results[FALLBACK_REGION] ? FALLBACK_REGION : null,
        ...normalizeRegion(regionBlock),
      };

      await pool.query(`update movies set watch_providers = $1::jsonb, watch_providers_synced_at = now() where id = $2`, [
        JSON.stringify(normalized),
        id,
      ]);
      updated += 1;
    } catch (err) {
      console.warn(`  watch-providers: skipping movie ${id} — ${err.message}`);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  console.log(`watch-providers: updated ${updated}/${movies.length} movie(s).`);
  await pool.end();
}

main().catch((err) => {
  console.error("watch-providers crawler failed:", err);
  process.exitCode = 1;
});
