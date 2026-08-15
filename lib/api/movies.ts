/*
This module provides database access functions for movie data stored in Postgres.
It includes methods for fetching movies by section, ID, rankings, and genre.
All queries are cached and the data is populated by a TMDB crawler process.
*/

import { getPool } from "@/lib/db";
import { cached } from "@/lib/cache";
import type { MediaItem } from "@/lib/api/normalize";
import { buildMediaSlug } from "@/lib/slug";

const DEFAULT_LIMIT = 12;

function rowToMedia(row: any): MediaItem {
  return {
    id: String(row.id),
    // `slug` is backfilled by the crawler, but fall back to generating one
    // on the fly for any row it hasn't touched yet so links never regress
    // to a bare numeric id.
    slug: row.slug || buildMediaSlug(row.title, row.year, String(row.id)),
    kind: "movie",
    title: row.title,
    description: (row.description ?? row.tagline ?? "A notable movie pick from the current catalog.")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180),
    posterUrl: row.poster_url ?? undefined,
    year: row.year ?? undefined,
    score: row.score !== null && row.score !== undefined ? Number(row.score) : undefined,
    genres: row.genres ?? [],
    source: "tmdb",
    watchProviders: row.watch_providers ?? null,
  };
}

export async function getMovieSection(
  section: "trending" | "popular" | "top-rated" | "upcoming" | "latest" | "search",
  query = "",
  page = 1,
  limit = DEFAULT_LIMIT
): Promise<MediaItem[]> {
  const offset = Math.max(0, (page - 1) * limit);
  const cacheKey = `movies:section:${section}:${query}:${page}:${limit}`;

  return cached(cacheKey, 300, async () => {
    const pool = getPool();
    let sql: string;
    let params: any[];

    switch (section) {
      case "search":
        if (!query.trim()) return [];
        sql = `select * from movies where title ilike $1
               order by plays desc nulls last limit $2 offset $3`;
        params = [`%${query.trim()}%`, limit, offset];
        break;
      case "popular":
        sql = `select * from movies order by plays desc nulls last, watchers desc nulls last limit $1 offset $2`;
        params = [limit, offset];
        break;
      case "top-rated":
        sql = `select * from movies order by score desc nulls last limit $1 offset $2`;
        params = [limit, offset];
        break;
      case "upcoming":
        sql = `select * from movies where released_at is null or released_at > now()
               order by list_count desc nulls last limit $1 offset $2`;
        params = [limit, offset];
        break;
      case "latest":
        sql = `select * from movies where released_at <= now()
               order by released_at desc nulls last limit $1 offset $2`;
        params = [limit, offset];
        break;
      case "trending":
      default:
        sql = `select * from movies order by watchers desc nulls last, plays desc nulls last limit $1 offset $2`;
        params = [limit, offset];
        break;
    }

    try {
      const { rows } = await pool.query(sql, params);
      return rows.map(rowToMedia);
    } catch (err) {
      console.error("movie section query failed:", err);
      return [];
    }
  });
}

export async function getMovieById(id: string): Promise<MediaItem | null> {
  return cached(`movies:id:${id}`, 3600, async () => {
    try {
      const { rows } = await getPool().query("select * from movies where id = $1", [id]);
      return rows[0] ? rowToMedia(rows[0]) : null;
    } catch (err) {
      console.error("movie by id query failed:", err);
      return null;
    }
  });
}

/**
 * Resolves a detail-page route param, which may be a name-based slug
 * ("the-matrix-1999-603") or, for links crawled/shared before slugs
 * existed, a bare numeric id ("603"). Returns whether the param already
 * matches the canonical slug so the page can 301-redirect legacy URLs
 * instead of serving duplicate content at two addresses.
 */
export async function getMovieBySlugOrId(
  param: string
): Promise<{ movie: MediaItem; isCanonical: boolean } | null> {
  return cached(`movies:slug-or-id:${param}`, 3600, async () => {
    try {
      const { rows } = await getPool().query(
        "select * from movies where slug = $1 or id = $1 order by (slug = $1) desc limit 1",
        [param]
      );
      if (!rows[0]) return null;
      const movie = rowToMedia(rows[0]);
      return { movie, isCanonical: movie.slug === param };
    } catch (err) {
      console.error("movie by slug/id query failed:", err);
      return null;
    }
  });
}

export async function getMovieRankings(page = 1, limit = 100): Promise<MediaItem[]> {
  const offset = Math.max(0, (page - 1) * limit);
  return cached(`movies:rankings:${page}:${limit}`, 600, async () => {
    try {
      const { rows } = await getPool().query(
        "select * from movies order by score desc nulls last limit $1 offset $2",
        [limit, offset]
      );
      return rows.map(rowToMedia);
    } catch (err) {
      console.error("movie rankings query failed:", err);
      return [];
    }
  });
}

/**
 * Lightweight slug/updated_at list for every movie, used to build the
 * sitemap. Intentionally selects only a few columns (not `select *`) since
 * this can run over thousands of rows.
 */
export async function getAllMovieSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  return cached("movies:all-slugs", 3600, async () => {
    try {
      const { rows } = await getPool().query(
        "select id, slug, title, year, updated_at from movies order by id"
      );
      return rows.map((row: any) => ({
        slug: row.slug || buildMediaSlug(row.title, row.year, String(row.id)),
        updatedAt: row.updated_at,
      }));
    } catch (err) {
      console.error("movie slug list query failed:", err);
      return [];
    }
  });
}

export async function getMovieByGenre(genre: string, page = 1, limit = 12): Promise<MediaItem[]> {
  const offset = Math.max(0, (page - 1) * limit);
  return cached(`movies:genre:${genre}:${page}:${limit}`, 600, async () => {
    try {
      const { rows } = await getPool().query(
        `select * from movies
         where lower($1) = any(select lower(g) from unnest(genres) as g)
         order by score desc nulls last limit $2 offset $3`,
        [genre, limit, offset]
      );
      return rows.map(rowToMedia);
    } catch (err) {
      console.error("movie by genre query failed:", err);
      return [];
    }
  });
}