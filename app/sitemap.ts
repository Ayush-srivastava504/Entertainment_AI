import { MetadataRoute } from "next";
import { animeRankings, movieRankings } from "@/lib/content/rankings";
import { blogPosts } from "@/lib/content/blog";

// Set this to your real domain once you've deployed and connected it.
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

export default function sitemap(): MetadataRoute.Sitemap {
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

  const animeRoutes = animeRankings.map((r) => ({
    url: `${BASE_URL}/anime/best/${r.slug}`,
    lastModified: new Date(),
  }));

  const movieRoutes = movieRankings.map((r) => ({
    url: `${BASE_URL}/movies/best/${r.slug}`,
    lastModified: new Date(),
  }));

  const blogRoutes = blogPosts.map((p) => ({
    url: `${BASE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.date),
  }));

  return [...staticRoutes, ...animeRoutes, ...movieRoutes, ...blogRoutes];
}
