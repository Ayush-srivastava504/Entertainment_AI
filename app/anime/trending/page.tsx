import { MediaShell } from "@/components/media/MediaShell";
import { MediaGridInfinite } from "@/components/media/MediaGridInfinite";
import { getAnimeSection } from "@/lib/api/anime";

export const metadata = {
  title: "Trending Anime — Marquee",
  description: "Trending anime for the moment.",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export default async function TrendingAnimePage() {
  const items = await getAnimeSection("trending", "", 1, PAGE_SIZE);

  return (
    <MediaShell title="Trending anime" eyebrow="🍥 anime" description="A quick view of the current anime wave." backHref="/anime">
      <MediaGridInfinite kind="anime" section="trending" initialItems={items} pageSize={PAGE_SIZE} basePath="/anime" />
    </MediaShell>
  );
}
