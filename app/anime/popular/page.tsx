import { MediaShell } from "@/components/media/MediaShell";
import { MediaGridInfinite } from "@/components/media/MediaGridInfinite";
import { getAnimeSection } from "@/lib/api/anime";

export const metadata = {
  title: "Popular Anime — Marquee",
  description: "Popular anime across the current catalog.",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export default async function PopularAnimePage() {
  const items = await getAnimeSection("popular", "", 1, PAGE_SIZE);

  return (
    <MediaShell title="Popular anime" eyebrow="🍥 anime" description="A broader browse of the most popular anime titles." backHref="/anime">
      <MediaGridInfinite kind="anime" section="popular" initialItems={items} pageSize={PAGE_SIZE} basePath="/anime" />
    </MediaShell>
  );
}
