import { MediaShell } from "@/components/media/MediaShell";
import { MediaGridInfinite } from "@/components/media/MediaGridInfinite";
import { getAnimeSection } from "@/lib/api/anime";

export const metadata = {
  title: "Upcoming Anime — Marquee",
  description: "Upcoming anime releases to keep on your radar.",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export default async function UpcomingAnimePage() {
  const items = await getAnimeSection("upcoming", "", 1, PAGE_SIZE);

  return (
    <MediaShell title="Upcoming anime" eyebrow="🍥 anime" description="A seasonal look at anime still on the way." backHref="/anime">
      <MediaGridInfinite kind="anime" section="upcoming" initialItems={items} pageSize={PAGE_SIZE} basePath="/anime" />
    </MediaShell>
  );
}
