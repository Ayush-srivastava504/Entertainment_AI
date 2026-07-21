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

/**
 * Autonomous content — read-only from the frontend's point of view.
 * Every row here was written by pipeline/generate_content.py once a day,
 * not by anything a user submitted. No writer functions exist here on
 * purpose: the app never creates or edits this content, only reads it.
 */

export interface BlogPostRow {
  slug: string;
  title: string;
  meta_description: string;
  body: string[];
  published_at: string;
}

export async function getBlogPosts(limit = 100): Promise<BlogPostRow[]> {
  const { rows } = await getPool().query<BlogPostRow>(
    `select slug, title, meta_description, body, published_at
     from blog_posts order by published_at desc limit $1`,
    [limit]
  );
  return rows;
}

export async function getBlogPostBySlug(
  slug: string
): Promise<BlogPostRow | null> {
  const { rows } = await getPool().query<BlogPostRow>(
    `select slug, title, meta_description, body, published_at
     from blog_posts where slug = $1`,
    [slug]
  );
  return rows[0] ?? null;
}

export interface RankingItem {
  title: string;
  year: number;
  blurb: string;
}

export interface RankingRow {
  slug: string;
  title: string;
  meta_description: string;
  intro: string;
  items: RankingItem[];
  published_at: string;
}

export async function getRankings(
  category: "movie" | "anime",
  limit = 100
): Promise<RankingRow[]> {
  const { rows } = await getPool().query<RankingRow>(
    `select slug, title, meta_description, intro, items, published_at
     from rankings where category = $1 order by published_at desc limit $2`,
    [category, limit]
  );
  return rows;
}

export async function getRankingBySlug(
  category: "movie" | "anime",
  slug: string
): Promise<RankingRow | null> {
  const { rows } = await getPool().query<RankingRow>(
    `select slug, title, meta_description, intro, items, published_at
     from rankings where category = $1 and slug = $2`,
    [category, slug]
  );
  return rows[0] ?? null;
}

export interface QuizOption {
  text: string;
  result: string;
}

export interface QuizQuestion {
  text: string;
  options: QuizOption[];
}

export interface QuizResult {
  key: string;
  title: string;
  description: string;
}

export interface QuizRow {
  slug: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  results: QuizResult[];
  published_at: string;
}

export async function getQuizzes(limit = 100): Promise<QuizRow[]> {
  const { rows } = await getPool().query<QuizRow>(
    `select slug, title, description, questions, results, published_at
     from quizzes order by published_at desc limit $1`,
    [limit]
  );
  return rows;
}

export async function getQuizBySlug(slug: string): Promise<QuizRow | null> {
  const { rows } = await getPool().query<QuizRow>(
    `select slug, title, description, questions, results, published_at
     from quizzes where slug = $1`,
    [slug]
  );
  return rows[0] ?? null;
}
