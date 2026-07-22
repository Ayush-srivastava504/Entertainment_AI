/*
This module provides a server-side Postgres client and data access functions
for the application. It includes database connection management, queue job
handling, and read/write operations for blogs, rankings, quizzes, likes,
comments, and chat messages.
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
      max: 3,
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

export async function markQueueJobDone(id: string, result: string): Promise<void> {
  await getPool().query(
    `update queue_jobs set status = 'done', result = $2, completed_at = now() where id = $1`,
    [id, result]
  );
}

export async function markQueueJobFailed(id: string, error: string): Promise<void> {
  await getPool().query(
    `update queue_jobs set status = 'failed', error = $2, completed_at = now() where id = $1`,
    [id, error.slice(0, 500)]
  );
}

export interface BlogPostRow {
  slug: string;
  title: string;
  meta_description: string;
  body: string[];
  category: string | null;
  tags: string[];
  source_name: string | null;
  source_url: string | null;
  likes: number;
  published_at: string;
}

const BLOG_TRENDING_ORDER = `
  order by likes / power(
    extract(epoch from (now() - published_at)) / 3600 + 2, 1.5
  ) desc, published_at desc
`;

export async function getBlogPosts(
  limit = 100,
  sort: "trending" | "recent" = "trending",
  category?: string
): Promise<BlogPostRow[]> {
  const orderClause =
    sort === "trending" ? BLOG_TRENDING_ORDER : "order by published_at desc";
  if (category) {
    const { rows } = await getPool().query<BlogPostRow>(
      `select slug, title, meta_description, body, category, tags, source_name, source_url, likes, published_at
       from blog_posts where category = $1 ${orderClause} limit $2`,
      [category, limit]
    );
    return rows;
  }
  const { rows } = await getPool().query<BlogPostRow>(
    `select slug, title, meta_description, body, category, tags, source_name, source_url, likes, published_at
     from blog_posts ${orderClause} limit $1`,
    [limit]
  );
  return rows;
}

export async function getBlogPostBySlug(
  slug: string
): Promise<BlogPostRow | null> {
  const { rows } = await getPool().query<BlogPostRow>(
    `select slug, title, meta_description, body, category, tags, source_name, source_url, likes, published_at
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
  correct: boolean;
}

export interface QuizQuestion {
  text: string;
  options: QuizOption[];
}

export interface QuizResultTier {
  minScore: number;
  maxScore: number;
  title: string;
  description: string;
}

export interface QuizRow {
  slug: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  results: QuizResultTier[];
  likes: number;
  published_at: string;
}

const QUIZ_TRENDING_ORDER = `
  order by likes / power(
    extract(epoch from (now() - published_at)) / 3600 + 2, 1.5
  ) desc, published_at desc
`;

export async function getQuizzes(
  limit = 100,
  sort: "trending" | "recent" = "trending"
): Promise<QuizRow[]> {
  const orderClause =
    sort === "trending" ? QUIZ_TRENDING_ORDER : "order by published_at desc";
  const { rows } = await getPool().query<QuizRow>(
    `select slug, title, description, questions, results, likes, published_at
     from quizzes ${orderClause} limit $1`,
    [limit]
  );
  return rows;
}

export async function getQuizBySlug(slug: string): Promise<QuizRow | null> {
  const { rows } = await getPool().query<QuizRow>(
    `select slug, title, description, questions, results, likes, published_at
     from quizzes where slug = $1`,
    [slug]
  );
  return rows[0] ?? null;
}

export async function incrementLikes(
  type: "blog" | "quiz",
  slug: string
): Promise<number | null> {
  const table = type === "blog" ? "blog_posts" : "quizzes";
  const { rows } = await getPool().query<{ likes: number }>(
    `update ${table} set likes = likes + 1 where slug = $1 returning likes`,
    [slug]
  );
  return rows[0]?.likes ?? null;
}

export interface CommentRow {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
}

export async function getComments(
  contentType: "blog" | "quiz",
  contentSlug: string
): Promise<CommentRow[]> {
  const { rows } = await getPool().query<CommentRow>(
    `select id, author_name, body, created_at from comments
     where content_type = $1 and content_slug = $2
     order by created_at desc`,
    [contentType, contentSlug]
  );
  return rows;
}

export async function addComment(
  contentType: "blog" | "quiz",
  contentSlug: string,
  authorName: string,
  body: string
): Promise<CommentRow> {
  const { rows } = await getPool().query<CommentRow>(
    `insert into comments (content_type, content_slug, author_name, body)
     values ($1, $2, $3, $4)
     returning id, author_name, body, created_at`,
    [contentType, contentSlug, authorName, body]
  );
  return rows[0];
}

export interface ChatMessageRow {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
}

const CHAT_TTL = "2 minutes";

async function pruneExpiredChatMessages(): Promise<void> {
  await getPool().query(
    `delete from chat_messages where created_at < now() - interval '${CHAT_TTL}'`
  );
}

export async function getRecentChatMessages(): Promise<ChatMessageRow[]> {
  await pruneExpiredChatMessages();
  const { rows } = await getPool().query<ChatMessageRow>(
    `select id, author_name, body, created_at from chat_messages
     where created_at > now() - interval '${CHAT_TTL}'
     order by created_at asc`
  );
  return rows;
}

export async function addChatMessage(
  authorName: string,
  body: string
): Promise<ChatMessageRow> {
  await pruneExpiredChatMessages();
  const { rows } = await getPool().query<ChatMessageRow>(
    `insert into chat_messages (author_name, body)
     values ($1, $2)
     returning id, author_name, body, created_at`,
    [authorName, body]
  );
  return rows[0];
}