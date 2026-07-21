import { normalizeAnime, type MediaItem } from "@/lib/api/normalize";

const JIKAN_BASE = "https://api.jikan.moe/v4";

async function fetchJikan(path: string) {
  const res = await fetch(`${JIKAN_BASE}${path}`, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`Jikan request failed: ${res.status}`);
  }
  return res.json();
}

const fallbackAnime: MediaItem[] = [
  { id: "1", kind: "anime", title: "Attack on Titan", description: "A tense, high-stakes anime about survival and rebellion.", posterUrl: "https://images.unsplash.com/photo-1517602302552-471fe67acf66?auto=format&fit=crop&w=500&q=80", year: 2013, score: 8.8, genres: ["Action", "Drama"], source: "jikan" },
  { id: "2", kind: "anime", title: "Spy x Family", description: "A warm and witty family comedy packed with spy intrigue.", posterUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=500&q=80", year: 2022, score: 8.4, genres: ["Comedy", "Action"], source: "jikan" },
  { id: "3", kind: "anime", title: "Fullmetal Alchemist: Brotherhood", description: "A legendary adventure of alchemy, brotherhood, and sacrifice.", posterUrl: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=500&q=80", year: 2009, score: 9.1, genres: ["Adventure", "Fantasy"], source: "jikan" },
];

async function readAnimeList(path: string, fallback: MediaItem[] = fallbackAnime): Promise<MediaItem[]> {
  try {
    const data = await fetchJikan(path);
    const items = Array.isArray(data?.data) ? data.data : [];
    return items.map((item: any) => normalizeAnime(item)).slice(0, 12);
  } catch {
    return fallback;
  }
}

export async function getAnimeSection(section: "trending" | "popular" | "top-rated" | "upcoming" | "search", query = "", page = 1, limit = 12): Promise<MediaItem[]> {
  if (section === "search") {
    if (!query) return fallbackAnime.slice(0, limit);
    return readAnimeList(`/anime?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);
  }
  if (section === "upcoming") {
    return readAnimeList(`/seasons/upcoming?page=${page}&limit=${limit}`);
  }
  return readAnimeList(`/top/anime?page=${page}&limit=${limit}`);
}

export async function getAnimeById(id: string): Promise<MediaItem | null> {
  try {
    const data = await fetchJikan(`/anime/${id}/full`);
    return normalizeAnime(data?.data ?? null);
  } catch {
    return fallbackAnime.find((item) => item.id === id) ?? fallbackAnime[0] ?? null;
  }
}

export async function getAnimeRankings(page = 1, limit = 100): Promise<MediaItem[]> {
  try {
    const data = await fetchJikan(`/top/anime?page=${page}&limit=${limit}`);
    const items = Array.isArray(data?.data) ? data.data : [];
    return items.map((item: any) => normalizeAnime(item));
  } catch {
    return fallbackAnime.slice(0, limit);
  }
}

export async function getAnimeByGenre(genre: string, page = 1, limit = 12): Promise<MediaItem[]> {
  const items = await getAnimeRankings(page, 24);
  const target = genre.toLowerCase();
  const filtered = items.filter((item) => item.genres.some((name) => name.toLowerCase().includes(target)));
  return filtered.slice(0, limit);
}
