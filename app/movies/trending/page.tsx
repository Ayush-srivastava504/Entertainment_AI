import { MediaShell } from "@/components/media/MediaShell";
import { MediaGrid } from "@/components/media/MediaGrid";
import { getMovieSection } from "@/lib/api/tmdb";

export const metadata = {
  title: "Trending Movies — Marquee",
  description: "Trending movies for tonight.",
};

export const revalidate = 3600;

export default async function TrendingMoviesPage() {
  const items = await getMovieSection("trending", "", 1, 12);

  return (
    <MediaShell title="Trending movies" eyebrow="🎬 movies" description="A daily snapshot of the most talked-about movies." backHref="/movies">
      <MediaGrid items={items} basePath="/movies" />
    </MediaShell>
  );
}
