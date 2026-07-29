import { MediaShell } from "@/components/media/MediaShell";
import { MediaGridInfinite } from "@/components/media/MediaGridInfinite";
import { getMovieSection } from "@/lib/api/movies";

export const metadata = {
  title: "Latest Movies — Marquee",
  description: "Latest movies in release order.",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export default async function LatestMoviesPage() {
  const items = await getMovieSection("latest", "", 1, PAGE_SIZE);

  return (
    <MediaShell title="Latest movies" eyebrow="🎬 movies" description="Now playing titles from the current catalog." backHref="/movies">
      <MediaGridInfinite kind="movie" section="latest" initialItems={items} pageSize={PAGE_SIZE} basePath="/movies" />
    </MediaShell>
  );
}
