/*
This module provides database access functions for "shorts" — vertical
swipeable story-card sets, one per anime/movie title. Rows are written
offline by crawler/shorts-crawler.mjs, never generated on-request.
*/

import { getPool } from "@/lib/db";
import { cached } from "@/lib/cache";

export interface ShortCard {
  heading: string;
  text: string;
}

export interface ShortItem {
  id: string;
  slug: string;
  title: string;
  contentType: "anime" | "movie";
  contentId: string;
  posterUrl: string | null;
  cards: ShortCard[];
  publishedAt: string;
}

function rowToShort(row: any): ShortItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    contentType: row.content_type,
    contentId: row.content_id,
    posterUrl: row.poster_url,
    cards: row.cards ?? [],
    publishedAt: row.published_at,
  };
}

export async function getShorts(page = 1, limit = 20): Promise<ShortItem[]> {
  const offset = Math.max(0, (page - 1) * limit);
  return cached(`shorts:feed:${page}:${limit}`, 300, async () => {
    try {
      const { rows } = await getPool().query(
        `select * from shorts order by published_at desc limit $1 offset $2`,
        [limit, offset]
      );
      return rows.map(rowToShort);
    } catch (err) {
      console.error("shorts feed query failed:", err);
      return [];
    }
  });
}

export async function getShortBySlug(slug: string): Promise<ShortItem | null> {
  return cached(`shorts:slug:${slug}`, 600, async () => {
    try {
      const { rows } = await getPool().query(`select * from shorts where slug = $1`, [slug]);
      return rows[0] ? rowToShort(rows[0]) : null;
    } catch (err) {
      console.error("short by slug query failed:", err);
      return null;
    }
  });
}
