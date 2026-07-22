/**
 * Movie reads — Postgres only. Never calls an external API directly.
 *
 * Source is Trakt.tv (crawler/trakt-crawler.mjs), a legitimate free
 * media-tracking API — used instead of TMDB (needs a paid-tier quota to
 * run at crawl volume) and instead of YTS (a torrent/piracy index, not
 * a real metadata API — its domain has since been taken down by
 * copyright enforcement, which is exactly why it doesn't belong here).
 * Poster art is optionally backfilled from OMDb by crawler/omdb-posters.mjs;
 * rows without one just render a placeholder.
 */
import { getPool } from "@/lib/db";
import { cached } from "@/lib/cache";
import type { MediaItem } from "@/lib/api/normalize";

const DEFAULT_LIMIT = 12;

function rowToMedia(row: any): MediaItem {
  return {
    id: String(row.id),
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
    source: "trakt",
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
        // Real anticipated-release data (Trakt watchlist adds), not a
        // "recently added to the catalog" approximation.
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
