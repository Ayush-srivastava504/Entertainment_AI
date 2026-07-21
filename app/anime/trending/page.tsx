import { MediaShell } from "@/components/media/MediaShell";
import { MediaGrid } from "@/components/media/MediaGrid";
import { getAnimeSection } from "@/lib/api/jikan";

export const metadata = {
  title: "Trending Anime — Marquee",
  description: "Trending anime for the moment.",
};

export const revalidate = 3600;

export default async function TrendingAnimePage() {
  const items = await getAnimeSection("trending", "", 1, 12);

  return (
    <MediaShell title="Trending anime" eyebrow="🍥 anime" description="A quick view of the current anime wave, pulled from Jikan." backHref="/anime">
      <MediaGrid items={items} basePath="/anime" />
    </MediaShell>
  );
}
