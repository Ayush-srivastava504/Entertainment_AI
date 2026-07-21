import { MediaShell } from "@/components/media/MediaShell";
import { MediaGrid } from "@/components/media/MediaGrid";
import { getMovieSection } from "@/lib/api/tmdb";

export const metadata = {
  title: "Popular Movies — Marquee",
  description: "Popular movies across the current catalog.",
};

export const revalidate = 3600;

export default async function PopularMoviesPage() {
  const items = await getMovieSection("popular", "", 1, 12);

  return (
    <MediaShell title="Popular movies" eyebrow="🎬 movies" description="A browse of the most commonly watched movies right now." backHref="/movies">
      <MediaGrid items={items} basePath="/movies" />
    </MediaShell>
  );
}
