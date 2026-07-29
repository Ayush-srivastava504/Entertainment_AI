import { MediaShell } from "@/components/media/MediaShell";
import { MediaGridInfinite } from "@/components/media/MediaGridInfinite";
import { SearchBar } from "@/components/media/SearchBar";
import { getMovieSection } from "@/lib/api/movies";

export const metadata = {
  title: "Search Movies — Marquee",
  description: "Search through movies with filters.",
};

const PAGE_SIZE = 24;

export default async function MoviesSearchPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const query = params.q ?? "";
  const items = await getMovieSection("search", query, 1, PAGE_SIZE);

  return (
    <MediaShell title="Search movies" eyebrow="🎬 movies" description="Search by title and browse the matching results." backHref="/movies">
      <div className="mb-8">
        <SearchBar initialValue={query} path="/movies/search" />
      </div>
      <MediaGridInfinite kind="movie" section="search" query={query} initialItems={items} pageSize={PAGE_SIZE} basePath="/movies" />
    </MediaShell>
  );
}
