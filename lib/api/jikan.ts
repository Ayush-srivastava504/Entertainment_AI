import { normalizeAnime, type MediaItem } from "@/lib/api/normalize";

const BASE = "https://api.jikan.moe/v4";

async function fetchJikan(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    next: { revalidate: 3600 },
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Jikan ${res.status}: ${await res.text()}`);
  }

  return res.json();
}

async function load(path: string, limit = 12): Promise<MediaItem[]> {
  const json = await fetchJikan(path);

  if (!Array.isArray(json.data)) {
    return [];
  }

  return json.data
    .map(normalizeAnime)
    .slice(0, limit);
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
  try {
    switch (section) {
      case "search":
        if (!query) return [];
        return load(
          `/anime?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`,
          limit
        );

      case "upcoming":
        return load(
          `/seasons/upcoming?page=${page}&limit=${limit}`,
          limit
        );

      case "popular":
        return load(
          `/top/anime?filter=bypopularity&page=${page}&limit=${limit}`,
          limit
        );

      case "top-rated":
        return load(
          `/top/anime?page=${page}&limit=${limit}`,
          limit
        );

      case "trending":
      default:
        return load(
          `/seasons/now?page=${page}&limit=${limit}`,
          limit
        );
    }
  } catch (err) {
    console.error("Jikan Error:", err);
    return [];
  }
}

export async function getAnimeById(id: string) {
  try {
    const json = await fetchJikan(`/anime/${id}/full`);
    return normalizeAnime(json.data);
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function getAnimeRankings(
  page = 1,
  limit = 100
) {
  return load(`/top/anime?page=${page}&limit=${limit}`, limit);
}

export async function getAnimeByGenre(
  genre: string,
  page = 1,
  limit = 12
) {
  const all = await getAnimeRankings(page, 100);

  return all
    .filter((a) =>
      a.genres.some((g) =>
        g.toLowerCase().includes(genre.toLowerCase())
      )
    )
    .slice(0, limit);
}