export type MediaKind = "anime" | "movie";

export interface MediaItem {
  id: string;
  kind: MediaKind;
  title: string;
  description: string;
  posterUrl?: string;
  year?: number;
  score?: number;
  genres: string[];
  source?: string;
}

export function normalizeAnime(item: any): MediaItem {
  const title = item?.title ?? item?.titles?.[0]?.title ?? "Untitled anime";
  const synopsis = item?.synopsis ?? item?.background ?? "A compelling anime pick from the current catalog.";
  const genres = Array.isArray(item?.genres)
    ? item.genres.map((genre: any) => genre?.name ?? genre).filter(Boolean)
    : [];
  return {
    id: String(item?.mal_id ?? item?.id ?? title),
    kind: "anime",
    title,
    description: synopsis.replace(/\s+/g, " ").trim().slice(0, 180),
    posterUrl: item?.images?.jpg?.image_url ?? item?.images?.webp?.image_url,
    year: item?.year ?? item?.aired?.prop?.from?.year,
    score: item?.score,
    genres,
    source: "jikan",
  };
}

export function normalizeMovie(item: any): MediaItem {
  const title = item?.title ?? item?.name ?? "Untitled movie";
  const description = item?.overview ?? item?.tagline ?? "A notable movie pick from the current catalog.";
  const genres = Array.isArray(item?.genres)
    ? item.genres.map((genre: any) => genre?.name ?? genre).filter(Boolean)
    : [];
  return {
    id: String(item?.id ?? title),
    kind: "movie",
    title,
    description: description.replace(/\s+/g, " ").trim().slice(0, 180),
    posterUrl: item?.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : undefined,
    year: item?.release_date ? Number(item.release_date.slice(0, 4)) : item?.first_air_date ? Number(item.first_air_date.slice(0, 4)) : undefined,
    score: item?.vote_average,
    genres,
    source: "tmdb",
  };
}
