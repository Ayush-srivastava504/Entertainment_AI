import { MediaShell } from "@/components/media/MediaShell";
import { MediaGridInfinite } from "@/components/media/MediaGridInfinite";
import { getMovieSection } from "@/lib/api/movies";

export const metadata = {
  title: "Trending Movies — Marquee",
  description: "Trending movies for tonight.",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export default async function TrendingMoviesPage() {
  const items = await getMovieSection("trending", "", 1, PAGE_SIZE);

  return (
    <MediaShell title="Trending movies" eyebrow="🎬 movies" description="A daily snapshot of the most talked-about movies." backHref="/movies">
      <MediaGridInfinite kind="movie" section="trending" initialItems={items} pageSize={PAGE_SIZE} basePath="/movies" />
    </MediaShell>
  );
}
