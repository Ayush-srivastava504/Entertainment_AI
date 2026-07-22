import { MediaShell } from "@/components/media/MediaShell";
import { MediaGrid } from "@/components/media/MediaGrid";
import { SearchBar } from "@/components/media/SearchBar";
import { getAnimeSection } from "@/lib/api/anime";

export const metadata = {
  title: "Search Anime — Marquee",
  description: "Search through anime titles and filters.",
};

export default async function AnimeSearchPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const query = params.q ?? "";
  const items = await getAnimeSection("search", query, 1, 12);

  return (
    <MediaShell title="Search anime" eyebrow="🍥 anime" description="Search by title and browse the matching Jikan results." backHref="/anime">
      <div className="mb-8">
        <SearchBar initialValue={query} path="/anime/search" />
      </div>
      <MediaGrid items={items} basePath="/anime" />
    </MediaShell>
  );
}
