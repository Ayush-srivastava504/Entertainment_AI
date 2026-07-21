import { MediaShell } from "@/components/media/MediaShell";
import { MediaGrid } from "@/components/media/MediaGrid";
import { SearchBar } from "@/components/media/SearchBar";
import { getMovieSection } from "@/lib/api/tmdb";

export const metadata = {
  title: "Search Movies — Marquee",
  description: "Search through movies with filters.",
};

export default async function MoviesSearchPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const query = params.q ?? "";
  const items = await getMovieSection("search", query, 1, 12);

  return (
    <MediaShell title="Search movies" eyebrow="🎬 movies" description="Search by title and browse the matching TMDB results." backHref="/movies">
      <div className="mb-8">
        <SearchBar initialValue={query} path="/movies/search" />
      </div>
      <MediaGrid items={items} basePath="/movies" />
    </MediaShell>
  );
}
