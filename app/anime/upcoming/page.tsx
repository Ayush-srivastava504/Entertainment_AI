import { MediaShell } from "@/components/media/MediaShell";
import { MediaGrid } from "@/components/media/MediaGrid";
import { getAnimeSection } from "@/lib/api/jikan";

export const metadata = {
  title: "Upcoming Anime — Marquee",
  description: "Upcoming anime releases to keep on your radar.",
};

export const revalidate = 3600;

export default async function UpcomingAnimePage() {
  const items = await getAnimeSection("upcoming", "", 1, 12);

  return (
    <MediaShell title="Upcoming anime" eyebrow="🍥 anime" description="A seasonal look at anime still on the way." backHref="/anime">
      <MediaGrid items={items} basePath="/anime" />
    </MediaShell>
  );
}
