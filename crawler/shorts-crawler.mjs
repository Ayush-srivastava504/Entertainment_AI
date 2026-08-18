/*
This crawler generates "shorts" — 5-card vertical story sets, one per
anime/movie title, for the /stories swipeable feed. It runs offline in
batches (not on-request), purely from data already in the anime/movies
tables — no external API and no LLM involved, so it's cheap to run on
every sync and never depends on an AI endpoint being configured.

Run standalone: `node crawler/shorts-crawler.mjs [--limit=50]`
*/

import { getPool } from "./db.mjs";
import { slugifyTitle } from "./lib/slug.mjs";

const BATCH_LIMIT = Number(process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 40);

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

  for (const kind of ["anime", "movie"]) {
    const titles = await pickTitlesMissingShorts(pool, kind, Math.ceil(BATCH_LIMIT / 2));
    console.log(`${kind}: ${titles.length} titles missing shorts (this batch)`);

    for (const title of titles) {
      const cards = buildTemplateCards(title);
      await upsertShort(pool, title, cards);
      console.log(`  + ${title.title}`);
    }
  }

  console.log("Done.");
  await pool.end();
}

main().catch((err) => {
  console.error("shorts crawler failed:", err);
  process.exit(1);
});
