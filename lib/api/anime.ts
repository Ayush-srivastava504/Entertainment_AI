/*
This module provides database access functions for anime data stored in Postgres.
It includes methods for fetching anime by section, ID, rankings, genre, and studios.
All queries are cached and the data is populated by a separate crawler process.
*/

import { getPool } from "@/lib/db";
import { cached } from "@/lib/cache";
import type { MediaItem } from "@/lib/api/normalize";
import { buildMediaSlug } from "@/lib/slug";

const DEFAULT_LIMIT = 12;

function rowToMedia(row: any): MediaItem {
  const title = row.title_english || row.title;
  return {
    id: String(row.id),
    slug: row.slug || buildMediaSlug(title, row.year, String(row.id)),
    kind: "anime",
    title,
    // An admin-written synopsis_override always wins over the raw crawled
    // synopsis — that's the fix for thin, duplicate catalog pages.
    description: (row.synopsis_override ?? row.synopsis ?? "A compelling anime pick from the current catalog.")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, row.synopsis_override ? 2000 : 180),
    posterUrl: row.poster_url ?? undefined,
    year: row.year ?? undefined,
    score: row.score !== null && row.score !== undefined ? Number(row.score) : undefined,
    genres: row.genres ?? [],
    source: row.source ?? "jikan",
    noindex: row.noindex ?? false,
  };
}

export async function getAnimeSection(
  section: "trending" | "popular" | "top-rated" | "upcoming" | "airing" | "search",
  query = "",
  page = 1,
  limit = DEFAULT_LIMIT
): Promise<MediaItem[]> {
  const offset = Math.max(0, (page - 1) * limit);
  const cacheKey = `anime:section:${section}:${query}:${page}:${limit}`;

  return cached(cacheKey, 300, async () => {
    const pool = getPool();
    let sql: string;
    let params: any[];

    switch (section) {
      case "search":
        if (!query.trim()) return [];
        sql = `select * from anime where title ilike $1 or title_english ilike $1
               order by popularity asc nulls last limit $2 offset $3`;
        params = [`%${query.trim()}%`, limit, offset];
        break;
      case "popular":
        sql = `select * from anime order by popularity asc nulls last, score desc nulls last limit $1 offset $2`;
        params = [limit, offset];
        break;
      case "top-rated":
        sql = `select * from anime order by score desc nulls last limit $1 offset $2`;
        params = [limit, offset];
        break;
      case "upcoming":
        sql = `select * from anime where status = 'Not yet aired'
               order by aired_from asc nulls last limit $1 offset $2`;
        params = [limit, offset];
        break;
      case "airing":
        sql = `select * from anime where status = 'Currently Airing'
               order by aired_from desc nulls last limit $1 offset $2`;
        params = [limit, offset];
        break;
      case "trending":
      default:
        sql = `select * from anime where status = 'Currently Airing'
               order by popularity asc nulls last limit $1 offset $2`;
        params = [limit, offset];
        break;
    }

    try {
      const { rows } = await pool.query(sql, params);
      return rows.map(rowToMedia);
    } catch (err) {
      console.error("anime section query failed:", err);
      return [];
    }
  });
}

export async function getAnimeById(id: string): Promise<MediaItem | null> {
  return cached(`anime:id:${id}`, 3600, async () => {
    try {
      const { rows } = await getPool().query("select * from anime where id = $1", [id]);
      return rows[0] ? rowToMedia(rows[0]) : null;
    } catch (err) {
      console.error("anime by id query failed:", err);
      return null;
    }
  });
}

/**
 * Resolves a detail-page route param, which may be a name-based slug
 * ("attack-on-titan-2013-16498") or, for links crawled/shared before slugs
 * existed, a bare numeric id ("16498"). Returns whether the param already
 * matches the canonical slug so the page can 301-redirect legacy URLs
 * instead of serving duplicate content at two addresses.
 */
export async function getAnimeBySlugOrId(
  param: string
): Promise<{ anime: MediaItem; isCanonical: boolean } | null> {
  return cached(`anime:slug-or-id:${param}`, 3600, async () => {
    try {
      const { rows } = await getPool().query(
        "select * from anime where slug = $1 or id = $1 order by (slug = $1) desc limit 1",
        [param]
      );
      if (!rows[0]) return null;
      const anime = rowToMedia(rows[0]);
      return { anime, isCanonical: anime.slug === param };
    } catch (err) {
      console.error("anime by slug/id query failed:", err);
      return null;
    }
  });
}

export async function getAnimeRankings(page = 1, limit = 100): Promise<MediaItem[]> {
  const offset = Math.max(0, (page - 1) * limit);
  return cached(`anime:rankings:${page}:${limit}`, 600, async () => {
    try {
      const { rows } = await getPool().query(
        "select * from anime order by score desc nulls last limit $1 offset $2",
        [limit, offset]
      );
      return rows.map(rowToMedia);
    } catch (err) {
      console.error("anime rankings query failed:", err);
      return [];
    }
  });
}

/**
 * Lightweight slug/updated_at list for every anime title, used to build the
 * sitemap. Intentionally selects only a few columns (not `select *`) since
 * this can run over thousands of rows.
 */
export async function getAllAnimeSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  return cached("anime:all-slugs", 3600, async () => {
    try {
      const { rows } = await getPool().query(
        "select id, slug, title, title_english, year, updated_at from anime where noindex = false order by id"
      );
      return rows.map((row: any) => ({
        slug: row.slug || buildMediaSlug(row.title_english || row.title, row.year, String(row.id)),
        updatedAt: row.updated_at,
      }));
    } catch (err) {
      console.error("anime slug list query failed:", err);
      return [];
    }
  });
}

export async function getAnimeByGenre(genre: string, page = 1, limit = 12): Promise<MediaItem[]> {
  const offset = Math.max(0, (page - 1) * limit);
  return cached(`anime:genre:${genre}:${page}:${limit}`, 600, async () => {
    try {
      const { rows } = await getPool().query(
        `select * from anime
         where lower($1) = any(select lower(g) from unnest(genres) as g)
         order by score desc nulls last limit $2 offset $3`,
        [genre, limit, offset]
      );
      return rows.map(rowToMedia);
    } catch (err) {
      console.error("anime by genre query failed:", err);
      return [];
    }
  });
}

export async function getAnimeStudios(page = 1, limit = 100): Promise<string[]> {
  const offset = Math.max(0, (page - 1) * limit);
  return cached(`anime:studios:${page}:${limit}`, 3600, async () => {
    try {
      const { rows } = await getPool().query(
        `select distinct s from anime, unnest(studios) as s
         order by s limit $1 offset $2`,
        [limit, offset]
      );
      return rows.map((r) => r.s);
    } catch (err) {
      console.error("anime studios query failed:", err);
      return [];
    }
  });
}