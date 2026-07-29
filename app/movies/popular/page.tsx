import { MediaShell } from "@/components/media/MediaShell";
import { MediaGridInfinite } from "@/components/media/MediaGridInfinite";
import { getMovieSection } from "@/lib/api/movies";

export const metadata = {
  title: "Popular Movies — Marquee",
  description: "Popular movies across the current catalog.",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export default async function PopularMoviesPage() {
  const items = await getMovieSection("popular", "", 1, PAGE_SIZE);

  return (
    <MediaShell title="Popular movies" eyebrow="🎬 movies" description="A browse of the most commonly watched movies right now." backHref="/movies">
      <MediaGridInfinite kind="movie" section="popular" initialItems={items} pageSize={PAGE_SIZE} basePath="/movies" />
    </MediaShell>
  );
}
