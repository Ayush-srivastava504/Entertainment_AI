import { MediaShell } from "@/components/media/MediaShell";
import { MediaGrid } from "@/components/media/MediaGrid";
import { getMovieSection } from "@/lib/api/movies";

export const metadata = {
  title: "Upcoming Movies — Marquee",
  description: "Upcoming movies to keep on your radar.",
};

export const revalidate = 3600;

export default async function UpcomingMoviesPage() {
  const items = await getMovieSection("upcoming", "", 1, 12);

  return (
    <MediaShell title="Upcoming movies" eyebrow="🎬 movies" description="Upcoming releases from the current TMDB feed." backHref="/movies">
      <MediaGrid items={items} basePath="/movies" />
    </MediaShell>
  );
}
