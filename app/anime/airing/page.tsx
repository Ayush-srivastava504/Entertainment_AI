import { MediaShell } from "@/components/media/MediaShell";
import { MediaGridInfinite } from "@/components/media/MediaGridInfinite";
import { getAnimeSection } from "@/lib/api/anime";

export const metadata = {
  title: "Airing Anime — Marquee",
  description: "Airing anime to follow right now.",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export default async function AiringAnimePage() {
  const items = await getAnimeSection("airing", "", 1, PAGE_SIZE);

  return (
    <MediaShell title="Airing anime" eyebrow="🍥 anime" description="Shows currently airing, newest first." backHref="/anime">
      <MediaGridInfinite kind="anime" section="airing" initialItems={items} pageSize={PAGE_SIZE} basePath="/anime" />
    </MediaShell>
  );
}
