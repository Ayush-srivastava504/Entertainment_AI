/*
This module builds curated "best of" and "mood" ranking pages (e.g. "Best
90s Anime", "Best Sci-Fi Movies", "Brotherhood & Found Family Anime") purely
from data already sitting in the anime/movies tables — no external API and
no LLM involved, so it's cheap to run on every sync and never goes stale.

Two kinds of lists are supported:
  - `filter` lists: a SQL WHERE fragment (decade, genre, etc.) run against
    the anime/movies table, ordered by score.
  - `seed` lists: a hand-picked title allowlist for a "mood" that doesn't
    map cleanly to a genre column (e.g. "brotherhood" stories). Only titles
    that actually exist in the DB are included, so a list never shows a
    title the catalog doesn't actually have.

Run standalone: `node crawler/mood-lists-crawler.mjs`
*/

import { getPool, upsertRankings } from "./db.mjs";

const MIN_ITEMS = 5; // skip publishing a list if the catalog can't fill it out

const ANIME_FILTER_LISTS = [
  {
    slug: "best-90s-anime",
    title: "Best 90s Anime",
    meta_description: "The essential anime of the 1990s, ranked by score.",
    intro: "Before streaming, before simulcasts — the shows that shaped a generation of anime fans.",
    where: "year between 1990 and 1999",
  },
  {
    slug: "best-2000s-anime",
    title: "Best 2000s Anime",
    meta_description: "The defining anime of the 2000s, ranked by score.",
    intro: "The decade that took anime global, from late-night blocks to early streaming.",
    where: "year between 2000 and 2009",
  },
  {
    slug: "best-2010s-anime",
    title: "Best 2010s Anime",
    meta_description: "The standout anime of the 2010s, ranked by score.",
    intro: "The simulcast era — a decade of anime landing worldwide the same week it aired in Japan.",
    where: "year between 2010 and 2019",
  },
  {
    slug: "best-scifi-anime",
    title: "Best Sci-Fi Anime",
    meta_description: "Top-rated science fiction anime to watch.",
    intro: "Space operas, mecha, and near-future what-ifs — ranked by score.",
    where: "'Sci-Fi' = any(genres) or 'Science Fiction' = any(genres)",
  },
  {
    slug: "best-fantasy-anime",
    title: "Best Fantasy Anime",
    meta_description: "Top-rated fantasy anime to watch.",
    intro: "Other worlds, magic systems, and epic stakes — ranked by score.",
    where: "'Fantasy' = any(genres)",
  },
];

const MOVIE_FILTER_LISTS = [
  {
    slug: "best-scifi-movies",
    title: "Best Sci-Fi Movies",
    meta_description: "Top-rated science fiction movies to watch.",
    intro: "From first-contact stories to dystopias — the sci-fi movies worth your time.",
    where: "'Science Fiction' = any(genres)",
  },
  {
    slug: "best-90s-movies",
    title: "Best 90s Movies",
    meta_description: "The essential movies of the 1990s, ranked by score.",
    intro: "A decade of movies that still gets quoted constantly.",
    where: "year between 1990 and 1999",
  },
  {
    slug: "best-2000s-movies",
    title: "Best 2000s Movies",
    meta_description: "The defining movies of the 2000s, ranked by score.",
    intro: "The blockbuster decade — ranked by score.",
    where: "year between 2000 and 2009",
  },
  {
    slug: "feel-good-movies",
    title: "What to Watch: Feel-Good Movies",
    meta_description: "Comedies and family movies to lift your mood.",
    intro: "For nights when you want something warm, funny, and low-stakes.",
    where: "('Comedy' = any(genres) or 'Family' = any(genres))",
  },
];

// Mood lists that don't map to a single genre column — curated by title,
// filtered down to whatever the catalog actually has.
const ANIME_SEED_LISTS = [
  {
    slug: "brotherhood-found-family-anime",
    title: "Brotherhood & Found Family Anime",
    meta_description: "Anime about loyalty, chosen family, and bonds forged the hard way.",
    intro: "For when you want camaraderie, sacrifice, and a crew that has each other's back.",
    titles: [
      "Fullmetal Alchemist: Brotherhood",
      "One Piece",
      "My Hero Academia",
      "Demon Slayer: Kimetsu no Yaiba",
      "Naruto",
      "Naruto: Shippuden",
      "Haikyu!!",
      "Jujutsu Kaisen",
      "Fairy Tail",
      "Hunter x Hunter",
      "Attack on Titan",
      "Gurren Lagann",
      "Black Clover",
      "My Hero Academia",
    ],
  },
];

// anime and movies have different column sets (anime: title_english/synopsis,
// movies: description) — this normalizes both into {display_title, blurb_source}.
const TABLE_COLUMNS = {
  anime: `title, coalesce(title_english, title) as display_title, year, synopsis as blurb_source`,
  movies: `title, title as display_title, year, description as blurb_source`,
};

async function buildFilterLists(pool, table, lists, category) {
  const rows = [];
  for (const list of lists) {
    const { rows: items } = await pool.query(
      `select ${TABLE_COLUMNS[table]}
       from ${table} where ${list.where} and year is not null
       order by score desc nulls last limit 15`
    );
    if (items.length < MIN_ITEMS) {
      console.log(`mood-lists: skipping '${list.slug}' — only ${items.length} matching titles (need ${MIN_ITEMS}+)`);
      continue;
    }
    rows.push({
      category,
      slug: list.slug,
      title: list.title,
      meta_description: list.meta_description,
      intro: list.intro,
      items: items.map((row) => ({
        title: row.display_title ?? row.title,
        year: row.year,
        blurb: (row.blurb_source ?? "").replace(/\s+/g, " ").trim().slice(0, 200),
      })),
    });
    console.log(`mood-lists: built '${list.slug}' with ${items.length} titles`);
  }
  return rows;
}

async function buildSeedLists(pool, table, lists, category) {
  const rows = [];
  for (const list of lists) {
    const titleCol = table === "anime" ? "title_english" : "title";
    const { rows: items } = await pool.query(
      `select ${TABLE_COLUMNS[table]}
       from ${table} where title = any($1) or ${titleCol} = any($1)
       order by score desc nulls last`,
      [list.titles]
    );
    // de-dupe (a title can match on either column)
    const seen = new Set();
    const unique = items.filter((row) => {
      const key = row.display_title ?? row.title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (unique.length < MIN_ITEMS) {
      console.log(`mood-lists: skipping '${list.slug}' — only ${unique.length} of the seed titles are in the catalog (need ${MIN_ITEMS}+)`);
      continue;
    }
    rows.push({
      category,
      slug: list.slug,
      title: list.title,
      meta_description: list.meta_description,
      intro: list.intro,
      items: unique.map((row) => ({
        title: row.display_title ?? row.title,
        year: row.year,
        blurb: (row.blurb_source ?? "").replace(/\s+/g, " ").trim().slice(0, 200),
      })),
    });
    console.log(`mood-lists: built '${list.slug}' with ${unique.length} titles`);
  }
  return rows;
}

async function main() {
  const pool = getPool();

  const rows = [
    ...(await buildFilterLists(pool, "anime", ANIME_FILTER_LISTS, "anime")),
    ...(await buildSeedLists(pool, "anime", ANIME_SEED_LISTS, "anime")),
    ...(await buildFilterLists(pool, "movies", MOVIE_FILTER_LISTS, "movie")),
  ];

  if (rows.length === 0) {
    console.log("mood-lists: nothing to publish this run (catalog too small yet).");
    return;
  }

  const count = await upsertRankings(rows);
  console.log(`mood-lists: upserted ${count} ranking list(s).`);
  await pool.end();
}

main().catch((err) => {
  console.error("mood-lists crawler failed:", err);
  process.exitCode = 1;
});
