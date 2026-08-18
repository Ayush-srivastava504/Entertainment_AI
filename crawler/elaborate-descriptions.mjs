/*
Backfills the `ai_description` column on `movies`/`anime` by rewriting the
raw TMDB/Jikan synopsis into a longer, original paragraph via Groq.

Why this is a separate, deliberately-throttled script rather than a
one-off bulk job:

  - It is resumable and idempotent. It only ever selects rows where
    ai_description is still null, so it's safe to run on a schedule and
    pick up wherever the last run left off — no cursor/offset bookkeeping,
    no risk of double-billing a row.
  - It is budget-capped per run (--limit, default 150) and paced with a
    fixed delay between calls (--delay-ms, default 2200 ≈ 27 req/min) to
    stay under Groq's free-tier RPM even before RPD comes into play.
    Free-tier limits vary by model and change over time — check
    https://console.groq.com/docs/rate-limits for your account's current
    numbers before raising --limit, since some models cap as low as
    1,000 requests/day shared across every Groq feature this project uses
    (this script + the recommend/find/tag/story tools in lib/ai.ts).
  - It prioritizes by popularity (watchers/plays for movies, popularity
    for anime) descending, so the titles most likely to actually get
    search traffic get elaborated first — not an arbitrary id order.
  - A failed row (bad response, rate limit, network error) is logged and
    skipped, not retried in the same run, so one flaky call can't burn
    the rest of the run's budget in retries.

Usage:
  node crawler/elaborate-descriptions.mjs --table=movies --limit=150
  node crawler/elaborate-descriptions.mjs --table=anime --limit=150
*/

import { getPool, sleep } from "./db.mjs";

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : fallback;
};

const TABLE = arg("table", "movies");
const LIMIT = Number(arg("limit", "150"));
const DELAY_MS = Number(arg("delay-ms", "2200"));
const MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!["movies", "anime"].includes(TABLE)) {
  console.error(`Unknown --table=${TABLE}, expected "movies" or "anime"`);
  process.exit(1);
}
if (!GROQ_API_KEY) {
  console.error("GROQ_API_KEY is not set — skipping (not a fatal error, so scheduled runs don't fail the whole workflow).");
  process.exit(0);
}

function buildPrompt({ title, year, genres, kind, synopsis }) {
  return [
    `You write original detail-page copy for a ${kind} database site.`,
    "Rewrite the synopsis below into 2 short paragraphs (90-130 words",
    "total) in your own words — do not copy phrases from the original.",
    "Mention the premise, tone/genre, and what makes it distinctive.",
    "No spoilers past the setup. No preamble, no title restatement,",
    "no headings, plain prose only.",
    "",
    `Title: ${title}${year ? ` (${year})` : ""}`,
    genres?.length ? `Genres: ${genres.join(", ")}` : "",
    `Original synopsis: ${synopsis}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function elaborate(row, kind) {
  const title = kind === "movie" ? row.title : row.title_english || row.title;
  const synopsis = kind === "movie" ? row.description : row.synopsis;
  const prompt = buildPrompt({ title, year: row.year, genres: row.genres, kind, synopsis });

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 220,
      temperature: 0.6,
    }),
  });

  if (res.status === 429) throw new Error("rate limited (429)");
  if (!res.ok) throw new Error(`Groq responded ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("empty response");
  return text;
}

async function main() {
  const pool = getPool();
  const kind = TABLE === "movies" ? "movie" : "anime";

  const selectSql =
    TABLE === "movies"
      ? `select id, title, year, genres, description from movies
         where ai_description is null and description is not null
         order by watchers desc nulls last, plays desc nulls last
         limit $1`
      : `select id, title, title_english, year, genres, synopsis from anime
         where ai_description is null and synopsis is not null
         order by popularity asc nulls last
         limit $1`;

  const { rows } = await pool.query(selectSql, [LIMIT]);
  console.log(`[elaborate:${TABLE}] ${rows.length} row(s) queued (limit=${LIMIT}, model=${MODEL})`);

  let done = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const aiDescription = await elaborate(row, kind);
      await pool.query(
        `update ${TABLE} set ai_description = $1, ai_description_generated_at = now() where id = $2`,
        [aiDescription, row.id]
      );
      done++;
    } catch (err) {
      failed++;
      console.warn(`[elaborate:${TABLE}] skipped id=${row.id}: ${err instanceof Error ? err.message : err}`);
    }
    await sleep(DELAY_MS);
  }

  console.log(`[elaborate:${TABLE}] done=${done} failed=${failed}`);
  await pool.end();
}

main().catch((err) => {
  console.error(`[elaborate:${TABLE}] fatal:`, err);
  process.exit(1);
});
