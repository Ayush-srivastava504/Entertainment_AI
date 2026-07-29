import { MediaShell } from "@/components/media/MediaShell";
import { MediaGridInfinite } from "@/components/media/MediaGridInfinite";
import { getMovieSection } from "@/lib/api/movies";

export const metadata = {
  title: "Top Rated Movies — Marquee",
  description: "Top-rated movies for your next watch list.",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export default async function TopRatedMoviesPage() {
  const items = await getMovieSection("top-rated", "", 1, PAGE_SIZE);

  return (
    <MediaShell title="Top rated movies" eyebrow="🎬 movies" description="The highest-rated movies in the current catalog." backHref="/movies">
      <MediaGridInfinite kind="movie" section="top-rated" initialItems={items} pageSize={PAGE_SIZE} basePath="/movies" />
    </MediaShell>
  );
}
