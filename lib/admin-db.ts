/*
Database access for the admin panel: site-wide stats, listing/editing
anime + movie rows (noindex/featured/synopsis_override), and comment
moderation. Deliberately separate from lib/api/* (the public read path,
which is cached) since admin reads/writes must always see fresh data and
never go through the public TTL cache.
*/

import { getPool } from "@/lib/db";
import { invalidate } from "@/lib/cache";

export type TitleKind = "anime" | "movie";

function table(kind: TitleKind): string {
  return kind === "anime" ? "anime" : "movies";
}

export interface AdminStats {
  animeTotal: number;
  animeNoindex: number;
  animeFeatured: number;
  movieTotal: number;
  movieNoindex: number;
  movieFeatured: number;
  commentsTotal: number;
  shortsTotal: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const pool = getPool();
  const [anime, movies, comments, shorts] = await Promise.all([
    pool.query(
      `select count(*)::int as total,
              count(*) filter (where noindex) ::int as noindex,
              count(*) filter (where featured)::int as featured
       from anime`
    ),
    pool.query(
      `select count(*)::int as total,
              count(*) filter (where noindex) ::int as noindex,
              count(*) filter (where featured)::int as featured
       from movies`
    ),
    pool.query(`select count(*)::int as total from comments`),
    pool.query(`select count(*)::int as total from shorts`),
  ]);

  return {
    animeTotal: anime.rows[0].total,
    animeNoindex: anime.rows[0].noindex,
    animeFeatured: anime.rows[0].featured,
    movieTotal: movies.rows[0].total,
    movieNoindex: movies.rows[0].noindex,
    movieFeatured: movies.rows[0].featured,
    commentsTotal: comments.rows[0].total,
    shortsTotal: shorts.rows[0].total,
  };
}

export interface AdminTitleRow {
  id: string;
  slug: string;
  title: string;
  year: number | null;
  score: number | null;
  posterUrl: string | null;
  noindex: boolean;
  featured: boolean;
  hasSynopsisOverride: boolean;
  hasThinDescription: boolean;
}

const THIN_DESCRIPTION_CHARS = 40;

export async function listAdminTitles(
  kind: TitleKind,
  opts: { query?: string; page?: number; limit?: number; filter?: "all" | "thin" | "noindex" | "featured" } = {}
): Promise<{ rows: AdminTitleRow[]; total: number }> {
  const t = table(kind);
  const descCol = kind === "anime" ? "synopsis" : "description";
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 25));
  const offset = (page - 1) * limit;

  const clauses: string[] = [];
  const params: unknown[] = [];

  if (opts.query?.trim()) {
    params.push(`%${opts.query.trim()}%`);
    clauses.push(`title ilike $${params.length}`);
  }
  if (opts.filter === "thin") {
    clauses.push(`coalesce(length(${descCol}), 0) < ${THIN_DESCRIPTION_CHARS} and synopsis_override is null`);
  } else if (opts.filter === "noindex") {
    clauses.push(`noindex = true`);
  } else if (opts.filter === "featured") {
    clauses.push(`featured = true`);
  }

  const where = clauses.length ? `where ${clauses.join(" and ")}` : "";

  const countRes = await getPool().query(`select count(*)::int as total from ${t} ${where}`, params);

  params.push(limit, offset);
  const { rows } = await getPool().query(
    `select id, slug, title, year, score, poster_url, noindex, featured,
            (synopsis_override is not null) as has_override,
            (coalesce(length(${descCol}), 0) < ${THIN_DESCRIPTION_CHARS}) as is_thin
     from ${t} ${where}
     order by title asc
     limit $${params.length - 1} offset $${params.length}`,
    params
  );

  return {
    total: countRes.rows[0].total,
    rows: rows.map((r: any) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      year: r.year,
      score: r.score !== null ? Number(r.score) : null,
      posterUrl: r.poster_url,
      noindex: r.noindex,
      featured: r.featured,
      hasSynopsisOverride: r.has_override,
      hasThinDescription: r.is_thin,
    })),
  };
}

export interface AdminTitleDetail extends AdminTitleRow {
  description: string | null;
  synopsisOverride: string | null;
  genres: string[];
}

export async function getAdminTitle(kind: TitleKind, id: string): Promise<AdminTitleDetail | null> {
  const t = table(kind);
  const descCol = kind === "anime" ? "synopsis" : "description";
  const { rows } = await getPool().query(
    `select id, slug, title, year, score, poster_url, noindex, featured, genres,
            ${descCol} as description, synopsis_override
     from ${t} where id = $1`,
    [id]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    year: row.year,
    score: row.score !== null ? Number(row.score) : null,
    posterUrl: row.poster_url,
    noindex: row.noindex,
    featured: row.featured,
    hasSynopsisOverride: row.synopsis_override !== null,
    hasThinDescription: (row.description ?? "").length < THIN_DESCRIPTION_CHARS,
    description: row.description,
    synopsisOverride: row.synopsis_override,
    genres: row.genres ?? [],
  };
}

export async function updateAdminTitle(
  kind: TitleKind,
  id: string,
  patch: { noindex?: boolean; featured?: boolean; synopsisOverride?: string | null }
): Promise<void> {
  const t = table(kind);
  const sets: string[] = [];
  const params: unknown[] = [];

  if (patch.noindex !== undefined) {
    params.push(patch.noindex);
    sets.push(`noindex = $${params.length}`);
  }
  if (patch.featured !== undefined) {
    params.push(patch.featured);
    sets.push(`featured = $${params.length}`);
  }
  if (patch.synopsisOverride !== undefined) {
    params.push(patch.synopsisOverride || null);
    sets.push(`synopsis_override = $${params.length}`);
  }
  if (!sets.length) return;

  params.push(id);
  await getPool().query(`update ${t} set ${sets.join(", ")} where id = $${params.length}`, params);

  // The public site caches slug lists (sitemap) and individual title reads;
  // both must reflect noindex/synopsis changes immediately, not after TTL.
  await invalidate(`${kind}:`);
}

export interface AdminCommentRow {
  id: string;
  contentType: string;
  contentSlug: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export async function listAdminComments(page = 1, limit = 30): Promise<{ rows: AdminCommentRow[]; total: number }> {
  const offset = (Math.max(1, page) - 1) * limit;
  const [countRes, rowsRes] = await Promise.all([
    getPool().query(`select count(*)::int as total from comments`),
    getPool().query(
      `select id, content_type, content_slug, author_name, body, created_at
       from comments order by created_at desc limit $1 offset $2`,
      [limit, offset]
    ),
  ]);
  return {
    total: countRes.rows[0].total,
    rows: rowsRes.rows.map((r: any) => ({
      id: r.id,
      contentType: r.content_type,
      contentSlug: r.content_slug,
      authorName: r.author_name,
      body: r.body,
      createdAt: r.created_at,
    })),
  };
}

export async function deleteAdminComment(id: string): Promise<void> {
  await getPool().query(`delete from comments where id = $1`, [id]);
}
