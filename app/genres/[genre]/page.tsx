import Link from "next/link";
import { notFound } from "next/navigation";
import { MediaGridInfinite } from "@/components/media/MediaGridInfinite";
import { getAnimeByGenre } from "@/lib/api/anime";
import { getMovieByGenre } from "@/lib/api/movies";
import { GENRES, isValidGenreSlug, genreQueryForSlug } from "@/lib/genres";

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.marquees.site").replace(/\/$/, "");

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ genre: string }> }) {
  const { genre } = await params;
  if (!isValidGenreSlug(genre)) return {};
  const label = GENRES.find((g) => g.slug === genre)?.label ?? genre;
  const title = `${label} Anime & Movies — Marquee`;
  const description = `Browse the best ${label.toLowerCase()} anime and movies, ranked by score and updated regularly.`;
  const url = `${BASE_URL}/genres/${genre}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

const PAGE_SIZE = 18;

export default async function GenreBrowsePage({ params }: { params: Promise<{ genre: string }> }) {
  const { genre } = await params;
  if (!isValidGenreSlug(genre)) notFound();
  const genreQuery = genreQueryForSlug(genre);

  const [animeItems, movieItems] = await Promise.all([
    getAnimeByGenre(genreQuery, 1, PAGE_SIZE),
    getMovieByGenre(genreQuery, 1, PAGE_SIZE),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <p className="font-mono text-xs tracking-[0.3em] text-marquee-gold">🎯 GENRE</p>
      <h1 className="mt-3 font-display text-3xl sm:text-5xl text-marquee-text capitalize">{GENRES.find((g) => g.slug === genre)?.label ?? genre} picks</h1>
      <p className="mt-4 max-w-2xl text-marquee-textDim">
        Anime and movies tagged {GENRES.find((g) => g.slug === genre)?.label ?? genre}, pulled from the current catalog.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {GENRES.map((g) => (
          <Link
            key={g.slug}
            href={`/genres/${g.slug}`}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${g.slug === genre ? "border-marquee-gold text-marquee-gold" : "border-marquee-line text-marquee-textDim hover:border-marquee-gold hover:text-marquee-gold"}`}
          >
            {g.label}
          </Link>
        ))}
      </div>
      <div className="mt-8 flex gap-4">
        <Link href="/anime" className="rounded border border-marquee-line px-4 py-2 text-marquee-text hover:border-marquee-gold">Anime hub</Link>
        <Link href="/movies" className="rounded border border-marquee-line px-4 py-2 text-marquee-text hover:border-marquee-gold">Movies hub</Link>
      </div>

      <h2 className="mt-12 mb-4 font-display text-2xl text-marquee-text">Anime</h2>
      <MediaGridInfinite kind="anime" section="genre" genre={genre} initialItems={animeItems} pageSize={PAGE_SIZE} basePath="/anime" />

      <h2 className="mt-14 mb-4 font-display text-2xl text-marquee-text">Movies</h2>
      <MediaGridInfinite kind="movie" section="genre" genre={genre} initialItems={movieItems} pageSize={PAGE_SIZE} basePath="/movies" />
    </div>
  );
}
