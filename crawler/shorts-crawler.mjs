/*
This crawler generates "shorts" — 5-card vertical story sets, one per
anime/movie title, for the /stories swipeable feed. It runs offline in
batches (not on-request):

  1. Picks titles that don't have a shorts row yet, best-scored first.
  2. If HF_SPACE_URL is configured, asks the AI endpoint for 5 cards.
  3. Falls back to a template built from real DB fields (title, year,
     score, genres, synopsis) if AI is unavailable or the call fails —
     so this script always produces something, no external service
     required to get the feature working end to end.

Run standalone: `node crawler/shorts-crawler.mjs [--limit=50]`
*/

import { getPool, sleep } from "./db.mjs";
import { slugifyTitle } from "./lib/slug.mjs";

const BATCH_LIMIT = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 40);
const AI_URL = process.env.HF_SPACE_URL;
const AI_TOKEN = process.env.HF_TOKEN;

function buildPrompt(title) {
  return [
    "You write vertical story-card sets (like Instagram/TikTok Stories) for",
    "a movie/anime database page. Given a title's real data below, output",
    'ONLY a JSON array of 5 objects, each { "heading": string (max 6 words),',
    '"text": string (max 220 characters) }. Card 1 is a hook. Cards 2-4 cover',
    "distinct angles (premise, standout element, vibe/tone, who it's for) —",
    "never restate the synopsis verbatim. Card 5 is a closing line inviting",
    "the reader to open the full page. No preamble, no markdown fences, no",
    "commentary — the response must be valid JSON and nothing else.",
    "",
    `Title: ${title.title}`,
    title.year ? `Year: ${title.year}` : "",
    title.genres?.length ? `Genres: ${title.genres.join(", ")}` : "",
    title.score ? `Score: ${title.score}/10` : "",
    title.synopsis ? `Known synopsis: ${title.synopsis}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function generateWithAI(title) {
  if (!AI_URL) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const headers = { "Content-Type": "application/json" };
    if (AI_TOKEN) headers.Authorization = `Bearer ${AI_TOKEN}`;
    const res = await fetch(AI_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ prompt: buildPrompt(title), max_tokens: 500, temperature: 0.8 }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = (data.text ?? "").trim().replace(/^```json\s*|```$/g, "");
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed) || parsed.length < 3) return null;
    return parsed
      .filter((c) => c && typeof c.heading === "string" && typeof c.text === "string")
      .slice(0, 6)
      .map((c) => ({ heading: c.heading.slice(0, 80), text: c.text.slice(0, 280) }));
  } catch (err) {
    console.warn(`  AI generation failed for "${title.title}": ${err.message}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function buildTemplateCards(title) {
  const kindLabel = title.contentType === "anime" ? "anime" : "movie";
  const yearBit = title.year ? ` (${title.year})` : "";
  const genreBit = title.genres?.length ? title.genres.slice(0, 3).join(" · ") : null;
  const synopsisBit = (title.synopsis ?? "").trim();

  return [
    { heading: title.title, text: `${title.title}${yearBit} — one of the picks in our ${kindLabel} catalog.` },
    genreBit
      ? { heading: "Genre", text: `Filed under ${genreBit}.` }
      : { heading: "Catalog pick", text: `A ${kindLabel} title worth a look.` },
    title.score
      ? { heading: "Rating", text: `Sitting at ${title.score.toFixed(1)}/10 with our audience.` }
      : { heading: "Fresh add", text: "Recently added to the catalog." },
    synopsisBit
      ? { heading: "What it's about", text: synopsisBit.slice(0, 200) }
      : { heading: "Discover it", text: `Details and where-to-watch info are on the full ${title.title} page.` },
    { heading: "Worth the watch?", text: `Open the full ${title.title} page for the details, rating, and more.` },
  ];
}

async function pickTitlesMissingShorts(pool, kind, limit) {
  const t = kind === "anime" ? "anime" : "movies";
  const descCol = kind === "anime" ? "synopsis" : "description";
  const nameCol = kind === "anime" ? "coalesce(title_english, title)" : "title";
  const { rows } = await pool.query(
    `select t.id, ${nameCol} as title, t.year, t.score, t.genres, coalesce(t.synopsis_override, t.${descCol}) as synopsis,
            t.poster_url, t.slug
     from ${t} t
     left join shorts s on s.content_type = $1 and s.content_id = t.id
     where s.id is null and t.noindex = false
     order by t.score desc nulls last
     limit $2`,
    [kind, limit]
  );
  return rows.map((r) => ({
    contentType: kind,
    contentId: r.id,
    title: r.title,
    year: r.year,
    score: r.score !== null ? Number(r.score) : null,
    genres: r.genres ?? [],
    synopsis: r.synopsis,
    posterUrl: r.poster_url,
    baseSlug: r.slug,
  }));
}

async function upsertShort(pool, title, cards) {
  const slug = `${slugifyTitle(title.title)}-${title.contentType}-${title.contentId}`.slice(0, 200);
  await pool.query(
    `insert into shorts (content_type, content_id, slug, title, poster_url, cards)
     values ($1, $2, $3, $4, $5, $6::jsonb)
     on conflict (content_type, content_id) do update set
       cards = excluded.cards,
       poster_url = excluded.poster_url,
       title = excluded.title`,
    [title.contentType, title.contentId, slug, title.title, title.posterUrl, JSON.stringify(cards)]
  );
}

async function main() {
  const pool = getPool();
  console.log(AI_URL ? "AI endpoint configured — generating with AI, template fallback on failure." : "No HF_SPACE_URL set — using template-based cards.");

  for (const kind of ["anime", "movie"]) {
    const titles = await pickTitlesMissingShorts(pool, kind, Math.ceil(BATCH_LIMIT / 2));
    console.log(`${kind}: ${titles.length} titles missing shorts (this batch)`);

    for (const title of titles) {
      const aiCards = await generateWithAI(title);
      const cards = aiCards ?? buildTemplateCards(title);
      await upsertShort(pool, title, cards);
      console.log(`  + ${title.title} (${aiCards ? "AI" : "template"})`);
      if (AI_URL) await sleep(400); // gentle on the AI endpoint
    }
  }

  console.log("Done.");
  await pool.end();
}

main().catch((err) => {
  console.error("shorts crawler failed:", err);
  process.exit(1);
});
