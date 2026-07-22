import { normalizeAnime, type MediaItem } from "@/lib/api/normalize";

const JIKAN_BASE = "https://api.jikan.moe/v4";

async function fetchJikan(path: string) {
  try {
    const res = await fetch(`${JIKAN_BASE}${path}`, {
      next: { revalidate: 3600 },
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      console.error(`Jikan ${res.status}: ${path}`);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error("Jikan fetch failed:", err);
    return null;
  }
}

async function readAnimeList(
  path: string,
  limit = 12
): Promise<MediaItem[]> {
  const data = await fetchJikan(path);

  if (!data || !Array.isArray(data.data)) {
    return [];
  }

  try {
    return data.data
      .map((item: any) => normalizeAnime(item))
      .slice(0, limit);
  } catch (err) {
    console.error("Normalize anime failed:", err);
    return [];
  }
}

export async function getAnimeSection(
  section:
    | "trending"
    | "popular"
    | "top-rated"
    | "upcoming"
    | "search",
  query = "",
  page = 1,
  limit = 12
): Promise<MediaItem[]> {
  switch (section) {
    case "search":
      if (!query.trim()) return [];
      return readAnimeList(
        `/anime?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`,
        limit
      );

    case "popular":
      return readAnimeList(
        `/top/anime?filter=bypopularity&page=${page}&limit=${limit}`,
        limit
      );

    case "top-rated":
      return readAnimeList(
        `/top/anime?page=${page}&limit=${limit}`,
        limit
      );

    case "upcoming":
      return readAnimeList(
        `/seasons/upcoming?page=${page}&limit=${limit}`,
        limit
      );

    case "trending":
    default:
      return readAnimeList(
        `/seasons/now?page=${page}&limit=${limit}`,
        limit
      );
  }
}

export async function getAnimeById(
  id: string
): Promise<MediaItem | null> {
  const data = await fetchJikan(`/anime/${id}/full`);

  if (!data?.data) {
    return null;
  }

  try {
    return normalizeAnime(data.data);
  } catch (err) {
    console.error("Normalize anime details failed:", err);
    return null;
  }
}

export async function getAnimeRankings(
  page = 1,
  limit = 100
): Promise<MediaItem[]> {
  return readAnimeList(
    `/top/anime?page=${page}&limit=${limit}`,
    limit
  );
}

export async function getAnimeByGenre(
  genre: string,
  page = 1,
  limit = 12
): Promise<MediaItem[]> {
  const items = await getAnimeRankings(page, 100);

  return items
    .filter((item) =>
      item.genres.some((g) =>
        g.toLowerCase().includes(genre.toLowerCase())
      )
    )
    .slice(0, limit);
}