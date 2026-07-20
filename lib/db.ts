/**
 * Server-side Postgres client. Only ever imported from route handlers.
 *
 * Set DATABASE_URL in Vercel's Project Settings → Environment Variables.
 * Use whichever Postgres you provisioned (Neon, Supabase, RDS...) — just
 * make sure it's reachable from both Vercel and your EC2 instance.
 *
 * Neon/Supabase pooled connection strings already include `sslmode=require`;
 * `rejectUnauthorized: false` below keeps this working with their default
 * self-signed-looking chain without extra config.
 */
import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set.");
    }
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 3, // serverless functions: keep this small
    });
  }
  return pool;
}

export interface QueueJob {
  id: string;
  task: string;
  input: Record<string, string>;
  status: "pending" | "done" | "failed";
  result: string | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export async function createQueueJob(
  task: string,
  input: Record<string, string>
): Promise<QueueJob> {
  const { rows } = await getPool().query<QueueJob>(
    `insert into queue_jobs (task, input) values ($1, $2::jsonb) returning *`,
    [task, JSON.stringify(input)]
  );
  return rows[0];
}

export async function getQueueJob(id: string): Promise<QueueJob | null> {
  const { rows } = await getPool().query<QueueJob>(
    `select * from queue_jobs where id = $1`,
    [id]
  );
  return rows[0] ?? null;
}
