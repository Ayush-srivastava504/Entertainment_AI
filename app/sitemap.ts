import { MetadataRoute } from "next";
import { getRankings, getBlogPosts, getQuizzes } from "@/lib/db";

// Set this to your real domain once you've deployed and connected it.
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "",
    "/movies",
    "/anime",
    "/anime/best",
    "/movies/best",
    "/stories",
    "/quiz",
    "/tools/tag-generator",
    "/tools/thumbnail-rating",
    "/blog",
    "/favorites",
  ].map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
  }));

  // All content-derived routes come from the DB — the daily pipeline run
  // is the only thing that ever adds to these tables.
  const [animeRankings, movieRankings, blogPosts, quizzes] = await Promise.all([
    getRankings("anime"),
    getRankings("movie"),
    getBlogPosts(),
    getQuizzes(),
  ]);

  const animeRoutes = animeRankings.map((r) => ({
    url: `${BASE_URL}/anime/best/${r.slug}`,
    lastModified: new Date(r.published_at),
  }));

  const movieRoutes = movieRankings.map((r) => ({
    url: `${BASE_URL}/movies/best/${r.slug}`,
    lastModified: new Date(r.published_at),
  }));

  const blogRoutes = blogPosts.map((p) => ({
    url: `${BASE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.published_at),
  }));

  const quizRoutes = quizzes.map((q) => ({
    url: `${BASE_URL}/quiz/${q.slug}`,
    lastModified: new Date(q.published_at),
  }));

  return [...staticRoutes, ...animeRoutes, ...movieRoutes, ...blogRoutes, ...quizRoutes];
}
