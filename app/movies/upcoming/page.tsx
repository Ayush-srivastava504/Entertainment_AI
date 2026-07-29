import { MediaShell } from "@/components/media/MediaShell";
import { MediaGridInfinite } from "@/components/media/MediaGridInfinite";
import { getMovieSection } from "@/lib/api/movies";

export const metadata = {
  title: "Upcoming Movies — Marquee",
  description: "Upcoming movies to keep on your radar.",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export default async function UpcomingMoviesPage() {
  const items = await getMovieSection("upcoming", "", 1, PAGE_SIZE);

  return (
    <MediaShell title="Upcoming movies" eyebrow="🎬 movies" description="Upcoming releases from the current catalog." backHref="/movies">
      <MediaGridInfinite kind="movie" section="upcoming" initialItems={items} pageSize={PAGE_SIZE} basePath="/movies" />
    </MediaShell>
  );
}
