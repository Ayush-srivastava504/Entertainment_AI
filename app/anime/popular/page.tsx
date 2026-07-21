import { MediaShell } from "@/components/media/MediaShell";
import { MediaGrid } from "@/components/media/MediaGrid";
import { getAnimeSection } from "@/lib/api/jikan";

export const metadata = {
  title: "Popular Anime — Marquee",
  description: "Popular anime across the current catalog.",
};

export const revalidate = 3600;

export default async function PopularAnimePage() {
  const items = await getAnimeSection("popular", "", 1, 12);

  return (
    <MediaShell title="Popular anime" eyebrow="🍥 anime" description="A broader browse of the most popular anime titles." backHref="/anime">
      <MediaGrid items={items} basePath="/anime" />
    </MediaShell>
  );
}
