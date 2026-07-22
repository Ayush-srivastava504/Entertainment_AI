import { MediaShell } from "@/components/media/MediaShell";
import { MediaGrid } from "@/components/media/MediaGrid";
import { getAnimeSection } from "@/lib/api/anime";

export const metadata = {
  title: "Top Rated Anime — Marquee",
  description: "Top-rated anime for your next watch list.",
};

export const dynamic = "force-dynamic";

export default async function TopRatedAnimePage() {
  const items = await getAnimeSection("top-rated", "", 1, 12);

  return (
    <MediaShell title="Top rated anime" eyebrow="🍥 anime" description="The highest-rated anime available through the current Jikan feed." backHref="/anime">
      <MediaGrid items={items} basePath="/anime" />
    </MediaShell>
  );
}
