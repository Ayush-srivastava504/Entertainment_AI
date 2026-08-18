import { buildMediaSlug } from "@/lib/slug";

export type MediaKind = "anime" | "movie";

export interface WatchProvider {
  name: string;
  logo: string | null;
}

export interface WatchProviders {
  region: string | null;
  link: string | null;
  flatrate: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
}

export interface MediaItem {
  id: string;
  /** URL-safe, human-readable identifier, e.g. "the-matrix-1999-603". Always
   *  present — falls back to a slugified title+id when the DB row predates
   *  the slug column. Detail-page links should use this, not `id`. */
  slug: string;
  kind: MediaKind;
  title: string;
  description: string;
  posterUrl?: string;
  year?: number;
  score?: number;
  genres: string[];
  source?: string;
  watchProviders?: WatchProviders | null;
  /** Set from the admin panel to hide a thin/duplicate page from Google + the sitemap. */
  noindex?: boolean;
}

export function normalizeAnime(item: any): MediaItem {
  const title = item?.title ?? item?.titles?.[0]?.title ?? "Untitled anime";
  const synopsis = item?.synopsis ?? item?.background ?? "A compelling anime pick from the current catalog.";
  const genres = Array.isArray(item?.genres)
    ? item.genres.map((genre: any) => genre?.name ?? genre).filter(Boolean)
    : [];
  const id = String(item?.mal_id ?? item?.id ?? title);
  const year = item?.year ?? item?.aired?.prop?.from?.year;
  return {
    id,
    slug: buildMediaSlug(title, year, id),
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
  const id = String(item?.id ?? title);
  const year = item?.release_date ? Number(item.release_date.slice(0, 4)) : item?.first_air_date ? Number(item.first_air_date.slice(0, 4)) : undefined;
  return {
    id,
    slug: buildMediaSlug(title, year, id),
    kind: "movie",
    title,
    description: description.replace(/\s+/g, " ").trim().slice(0, 180),
    posterUrl: item?.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : undefined,
    year,
    score: item?.vote_average,
    genres,
    source: "tmdb",
  };
}
