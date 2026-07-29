import { MediaShell } from "@/components/media/MediaShell";
import { MediaGridInfinite } from "@/components/media/MediaGridInfinite";
import { getAnimeSection } from "@/lib/api/anime";

export const metadata = {
  title: "Top Rated Anime — Marquee",
  description: "Top-rated anime for your next watch list.",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export default async function TopRatedAnimePage() {
  const items = await getAnimeSection("top-rated", "", 1, PAGE_SIZE);

  return (
    <MediaShell title="Top rated anime" eyebrow="🍥 anime" description="The highest-rated anime in the current catalog." backHref="/anime">
      <MediaGridInfinite kind="anime" section="top-rated" initialItems={items} pageSize={PAGE_SIZE} basePath="/anime" />
    </MediaShell>
  );
}
