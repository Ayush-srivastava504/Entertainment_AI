import { MediaShell } from "@/components/media/MediaShell";
import { MediaGridInfinite } from "@/components/media/MediaGridInfinite";
import { SearchBar } from "@/components/media/SearchBar";
import { getAnimeSection } from "@/lib/api/anime";

export const metadata = {
  title: "Search Anime — Marquee",
  description: "Search through anime titles and filters.",
};

const PAGE_SIZE = 24;

export default async function AnimeSearchPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const query = params.q ?? "";
  const items = await getAnimeSection("search", query, 1, PAGE_SIZE);

  return (
    <MediaShell title="Search anime" eyebrow="🍥 anime" description="Search by title and browse the matching results." backHref="/anime">
      <div className="mb-8">
        <SearchBar initialValue={query} path="/anime/search" />
      </div>
      <MediaGridInfinite kind="anime" section="search" query={query} initialItems={items} pageSize={PAGE_SIZE} basePath="/anime" />
    </MediaShell>
  );
}
