/*
This module provides database utility functions for crawlers, including
connection management, sync state recording, and batch upsert operations
for blog posts, quizzes, and anime data. It handles transaction management
and conflict resolution for each data type.
*/

import pg from "pg";

const { Pool } = pg;
let pool;

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set. Export it or add it to .env and run with --env-file=.env");
    }
    pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 4 });
  }
  return pool;
}

export async function recordSync(source, { pages, rows, full, details } = {}) {
  const client = getPool();
  await client.query(
    `insert into sync_state (source, last_run_at, last_full_sync_at, last_pages_crawled, last_rows_upserted, details)
     values ($1, now(), case when $4 then now() else null end, $2, $3, $5)
     on conflict (source) do update set
       last_run_at = now(),
       last_full_sync_at = case when $4 then now() else sync_state.last_full_sync_at end,
       last_pages_crawled = $2,
       last_rows_upserted = $3,
       details = $5`,
    [source, pages, rows, full, details ? JSON.stringify(details) : null]
  );
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function upsertBlogPosts(rows) {
  if (rows.length === 0) return 0;
  const pool = getPool();
  const client = await pool.connect();
  let count = 0;
  try {
    await client.query("begin");
    for (const r of rows) {
      const res = await client.query(
        `insert into blog_posts (slug, title, meta_description, body, category, tags, source_name, source_url, published_at)
         values ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9)
         on conflict (source_url) do update set
           title = excluded.title, meta_description = excluded.meta_description, body = excluded.body,
           category = excluded.category, tags = excluded.tags, source_name = excluded.source_name
         where blog_posts.source_url is not null`,
        [r.slug, r.title, r.meta_description, JSON.stringify(r.body), r.category, r.tags, r.source_name, r.source_url, r.published_at]
      );
      count += res.rowCount;
    }
    await client.query("commit");
    return count;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export async function upsertQuizzes(rows) {
  if (rows.length === 0) return 0;
  const pool = getPool();
  const client = await pool.connect();
  let count = 0;
  try {
    await client.query("begin");
    for (const r of rows) {
      const res = await client.query(
        `insert into quizzes (slug, title, description, questions, results)
         values ($1,$2,$3,$4::jsonb,$5::jsonb)
         on conflict (slug) do update set
           title = excluded.title, description = excluded.description,
           questions = excluded.questions, results = excluded.results`,
        [r.slug, r.title, r.description, JSON.stringify(r.questions), JSON.stringify(r.results)]
      );
      count += res.rowCount;
    }
    await client.query("commit");
    return count;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export async function upsertAnimeBatch(rows) {
  if (rows.length === 0) return 0;
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("begin");
    for (const r of rows) {
      await client.query(
        `insert into anime (id, title, title_english, synopsis, poster_url, trailer_url, year, score,
                             popularity, rank, episodes, status, type, genres, studios, aired_from, aired_to,
                             raw, source, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,now())
         on conflict (id) do update set
           title = excluded.title, title_english = excluded.title_english, synopsis = excluded.synopsis,
           poster_url = excluded.poster_url, trailer_url = excluded.trailer_url, year = excluded.year,
           score = excluded.score, popularity = excluded.popularity, rank = excluded.rank,
           episodes = excluded.episodes, status = excluded.status, type = excluded.type,
           genres = excluded.genres, studios = excluded.studios, aired_from = excluded.aired_from,
           aired_to = excluded.aired_to, raw = excluded.raw, source = excluded.source, updated_at = now()`,
        [
          r.id, r.title, r.title_english, r.synopsis, r.poster_url, r.trailer_url, r.year, r.score,
          r.popularity, r.rank, r.episodes, r.status, r.type, r.genres, r.studios, r.aired_from, r.aired_to,
          JSON.stringify(r.raw), r.source,
        ]
      );
    }
    await client.query("commit");
    return rows.length;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}