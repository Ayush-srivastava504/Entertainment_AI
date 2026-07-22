import { MetadataRoute } from "next";
import { getRankings, getBlogPosts, getQuizzes } from "@/lib/db";

const BASE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.marquees.site"
).replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "",
    "/movies",
    "/anime",
    "/rankings",
    "/rankings/anime",
    "/rankings/movies",
    "/search",
    "/quizzes",
    "/blog",
    "/favorites",
  ].map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
  }));

  const [animeRankings, movieRankings, blogPosts, quizzes] = await Promise.all([
    getRankings("anime"),
    getRankings("movie"),
    getBlogPosts(),
    getQuizzes(),
  ]);

  const animeRoutes = animeRankings.map((r) => ({
    url: `${BASE_URL}/anime/${r.slug}`,
    lastModified: new Date(r.published_at),
  }));

  const movieRoutes = movieRankings.map((r) => ({
    url: `${BASE_URL}/movies/${r.slug}`,
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
    ...animeRoutes,
    ...movieRoutes,
    ...blogRoutes,
    ...quizRoutes,
  ];
}