/*
Central genre list shared by /genres/[genre], /rankings/genre/[genre], and the
genre filter dropdown on the movies/anime hub pages. `slug` is the URL-safe
value used in routes; `query` is the actual genre string to match against the
catalog's `genres` column (TMDB/Jikan naming doesn't always match the slug,
e.g. "sci-fi" -> "Science Fiction").
*/

export interface GenreOption {
  slug: string;
  label: string;
  query: string;
}

export const GENRES: GenreOption[] = [
  { slug: "action", label: "Action", query: "Action" },
  { slug: "adventure", label: "Adventure", query: "Adventure" },
  { slug: "comedy", label: "Comedy", query: "Comedy" },
  { slug: "drama", label: "Drama", query: "Drama" },
  { slug: "fantasy", label: "Fantasy", query: "Fantasy" },
  { slug: "horror", label: "Horror", query: "Horror" },
  { slug: "romance", label: "Romance", query: "Romance" },
  { slug: "thriller", label: "Thriller", query: "Thriller" },
  { slug: "mystery", label: "Mystery", query: "Mystery" },
  { slug: "crime", label: "Crime", query: "Crime" },
  { slug: "sci-fi", label: "Sci-Fi", query: "Science Fiction" },
  { slug: "animation", label: "Animation", query: "Animation" },
  { slug: "family", label: "Family", query: "Family" },
];

export const GENRE_SLUGS = GENRES.map((g) => g.slug);

export function genreQueryForSlug(slug: string): string {
  return GENRES.find((g) => g.slug === slug)?.query ?? slug;
}

export function isValidGenreSlug(slug: string): boolean {
  return GENRE_SLUGS.includes(slug);
}
