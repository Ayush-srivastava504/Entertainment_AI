import { MetadataRoute } from "next";
import { getRankings, getBlogPosts, getQuizzes } from "@/lib/db";
import { getAllMovieIds } from "@/lib/api/movies";
import { getAllAnimeIds } from "@/lib/api/anime";
import { GENRE_SLUGS } from "@/lib/genres";

const BASE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.marquees.site"
).replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "",
    "/movies",
    "/movies/trending",
    "/movies/popular",
    "/movies/top-rated",
    "/movies/upcoming",
    "/movies/latest",
    "/movies/search",
    "/anime",
    "/anime/trending",
    "/anime/popular",
    "/anime/top-rated",
    "/anime/upcoming",
    "/anime/airing",
    "/anime/search",
    "/rankings",
    "/rankings/anime",
    "/rankings/movies",
    "/search",
    "/quizzes",
    "/blog",
    "/tools/thumbnail-rating",
    "/tools/tag-generator",
  ].map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
  }));

  const genreRoutes = GENRE_SLUGS.flatMap((genre) => [
    { url: `${BASE_URL}/genres/${genre}`, lastModified: new Date() },
    { url: `${BASE_URL}/rankings/genre/${genre}`, lastModified: new Date() },
  ]);

  const [animeRankings, movieRankings, blogPosts, quizzes, movieIds, animeIds] =
    await Promise.all([
      getRankings("anime"),
      getRankings("movie"),
      getBlogPosts(),
      getQuizzes(),
      getAllMovieIds(),
      getAllAnimeIds(),
    ]);

  // Individual title-detail pages — /movies/[id] and /anime/[id] — pulled
  // straight from the DB so every crawled title gets a sitemap entry, not
  // just the curated ranking lists above.
  const movieDetailRoutes = movieIds.map(({ id, updatedAt }) => ({
    url: `${BASE_URL}/movies/${id}`,
    lastModified: updatedAt ?? new Date(),
  }));

  const animeDetailRoutes = animeIds.map(({ id, updatedAt }) => ({
    url: `${BASE_URL}/anime/${id}`,
    lastModified: updatedAt ?? new Date(),
  }));

  // These previously pointed at /anime/[slug] and /movies/[slug], which are
  // the individual title-detail routes (looked up by TMDB/Jikan id) — the
  // mood-list slugs never matched a real title there, so every one of these
  // URLs 404'd in Google Search Console. They now point at the dedicated
  // mood-list pages under /rankings/anime/[slug] and /rankings/movies/[slug].
  const animeRoutes = animeRankings.map((r) => ({
    url: `${BASE_URL}/rankings/anime/${r.slug}`,
    lastModified: new Date(r.published_at),
  }));

  const movieRoutes = movieRankings.map((r) => ({
    url: `${BASE_URL}/rankings/movies/${r.slug}`,
    lastModified: new Date(r.published_at),
  }));

  const blogRoutes = blogPosts.map((p) => ({
    url: `${BASE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.published_at),
  }));

  const quizRoutes = quizzes.map((q) => ({
    url: `${BASE_URL}/quizzes/${q.slug}`,
    lastModified: new Date(q.published_at),
  }));

  return [
    ...staticRoutes,
    ...genreRoutes,
    ...movieDetailRoutes,
    ...animeDetailRoutes,
    ...animeRoutes,
    ...movieRoutes,
    ...blogRoutes,
    ...quizRoutes,
  ];
}