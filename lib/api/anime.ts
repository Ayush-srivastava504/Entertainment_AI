/**
 * Anime reads — Postgres only. Never calls AniList/Kitsu/Jikan directly.
 *
 * The `anime` table is populated exclusively by crawler/anime-sync.mjs on
 * a schedule (see .github/workflows/sync.yml), which tries AniList first,
 * falls back to Kitsu, and falls back to Jikan last (crawler/sources/*.mjs).
 * This keeps request latency independent of any single upstream API's
 * rate limits and uptime, and lets every section below run as a fast,
 * indexed SQL query.
 */
import { getPool } from "@/lib/db";
import { cached } from "@/lib/cache";
import type { MediaItem } from "@/lib/api/normalize";

const DEFAULT_LIMIT = 12;

function rowToMedia(row: any): MediaItem {
  return {
    id: String(row.id),
    kind: "anime",
    title: row.title_english || row.title,
    description: (row.synopsis ?? "A compelling anime pick from the current catalog.")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180),
    posterUrl: row.poster_url ?? undefined,
    year: row.year ?? undefined,
    score: row.score !== null && row.score !== undefined ? Number(row.score) : undefined,
    genres: row.genres ?? [],
    source: row.source ?? "jikan",
  };
}

export async function getAnimeSection(
  section: "trending" | "popular" | "top-rated" | "upcoming" | "search",
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
