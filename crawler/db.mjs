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

export async function recordSync(source, { pages, rows, full }) {
  const client = getPool();
  await client.query(
    `insert into sync_state (source, last_run_at, last_full_sync_at, last_pages_crawled, last_rows_upserted)
     values ($1, now(), case when $4 then now() else null end, $2, $3)
     on conflict (source) do update set
       last_run_at = now(),
       last_full_sync_at = case when $4 then now() else sync_state.last_full_sync_at end,
       last_pages_crawled = $2,
       last_rows_upserted = $3`,
    [source, pages, rows, full]
  );
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
