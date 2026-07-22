import { MediaShell } from "@/components/media/MediaShell";
import { MediaGrid } from "@/components/media/MediaGrid";
import { getMovieSection } from "@/lib/api/movies";

export const metadata = {
  title: "Latest Movies — Marquee",
  description: "Latest movies in release order.",
};

export const revalidate = 3600;

export default async function LatestMoviesPage() {
  const items = await getMovieSection("latest", "", 1, 12);

  return (
    <MediaShell title="Latest movies" eyebrow="🎬 movies" description="Now playing titles from the current TMDB feed." backHref="/movies">
      <MediaGrid items={items} basePath="/movies" />
    </MediaShell>
  );
}
