import { normalizeMovie, type MediaItem } from "@/lib/api/normalize";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_API_KEY = process.env.TMDB_API_KEY;

async function fetchTmdb(path: string) {
  if (!TMDB_API_KEY) {
    throw new Error("TMDB_API_KEY is not set");
  }
  const res = await fetch(`${TMDB_BASE}${path}${path.includes("?") ? "&" : "?"}api_key=${TMDB_API_KEY}&language=en-US`, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`TMDB request failed: ${res.status}`);
  }
  return res.json();
}

const fallbackMovies: MediaItem[] = [
  { id: "550", kind: "movie", title: "Fight Club", description: "A cult classic that turns identity and masculinity into a brutal mirror.", posterUrl: "https://images.unsplash.com/photo-1517602302552-471fe67acf66?auto=format&fit=crop&w=500&q=80", year: 1999, score: 8.4, genres: ["Drama", "Thriller"], source: "tmdb" },
  { id: "13", kind: "movie", title: "Forrest Gump", description: "An uplifting and moving life story anchored by unforgettable performances.", posterUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=500&q=80", year: 1994, score: 8.5, genres: ["Drama", "Romance"], source: "tmdb" },
  { id: "680", kind: "movie", title: "Pulp Fiction", description: "A nonlinear crime masterpiece with razor-sharp dialogue and style.", posterUrl: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=500&q=80", year: 1994, score: 8.5, genres: ["Crime", "Thriller"], source: "tmdb" },
];

async function readMovies(path: string, fallback: MediaItem[] = fallbackMovies): Promise<MediaItem[]> {
  try {
    const data = await fetchTmdb(path);
    const items = Array.isArray(data?.results) ? data.results : [];
    return items.map((item: any) => normalizeMovie(item)).slice(0, 12);
  } catch {
    return fallback;
  }
}

export async function getMovieSection(section: "trending" | "popular" | "top-rated" | "upcoming" | "latest" | "search", query = "", page = 1, limit = 12): Promise<MediaItem[]> {
  if (section === "search") {
    if (!query) return fallbackMovies.slice(0, limit);
    return readMovies(`/search/movie?query=${encodeURIComponent(query)}&page=${page}`);
  }
  if (section === "trending") {
    return readMovies(`/trending/movie/day?page=${page}`);
  }
  if (section === "popular") {
    return readMovies(`/movie/popular?page=${page}`);
  }
  if (section === "top-rated") {
    return readMovies(`/movie/top_rated?page=${page}`);
  }
  if (section === "upcoming") {
    return readMovies(`/movie/upcoming?page=${page}`);
  }
  if (section === "latest") {
    return readMovies(`/movie/now_playing?page=${page}`);
  }
  return fallbackMovies;
}

export async function getMovieById(id: string): Promise<MediaItem | null> {
  try {
    const data = await fetchTmdb(`/movie/${id}`);
    return normalizeMovie(data);
  } catch {
    return fallbackMovies.find((item) => item.id === id) ?? fallbackMovies[0] ?? null;
  }
}

export async function getMovieRankings(page = 1, limit = 100): Promise<MediaItem[]> {
  try {
    const data = await fetchTmdb(`/movie/top_rated?page=${page}`);
    const items = Array.isArray(data?.results) ? data.results : [];
    return items.map((item: any) => normalizeMovie(item)).slice(0, limit);
  } catch {
    return fallbackMovies.slice(0, limit);
  }
}

export async function getMovieByGenre(genre: string, page = 1, limit = 12): Promise<MediaItem[]> {
  const items = await getMovieRankings(page, 24);
  const target = genre.toLowerCase();
  const filtered = items.filter((item) => item.genres.some((name) => name.toLowerCase().includes(target)));
  return filtered.slice(0, limit);
}
