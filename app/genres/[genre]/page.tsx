import Link from "next/link";
import { notFound } from "next/navigation";
import { MediaGridInfinite } from "@/components/media/MediaGridInfinite";
import { getAnimeByGenre } from "@/lib/api/anime";
import { getMovieByGenre } from "@/lib/api/movies";

const allowedGenres = ["action", "comedy", "drama", "fantasy", "horror", "romance", "thriller"];

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ genre: string }> }) {
  const { genre } = await params;
  return {
    title: `${genre[0]?.toUpperCase()}${genre.slice(1)} — Marquee`,
    description: `Browse anime and movie picks in the ${genre} genre.`,
  };
}

const PAGE_SIZE = 18;

export default async function GenreBrowsePage({ params }: { params: Promise<{ genre: string }> }) {
  const { genre } = await params;
  if (!allowedGenres.includes(genre)) notFound();

  const [animeItems, movieItems] = await Promise.all([
    getAnimeByGenre(genre, 1, PAGE_SIZE),
    getMovieByGenre(genre, 1, PAGE_SIZE),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <p className="font-mono text-xs tracking-[0.3em] text-marquee-gold">🎯 GENRE</p>
      <h1 className="mt-3 font-display text-3xl sm:text-5xl text-marquee-text capitalize">{genre} picks</h1>
      <p className="mt-4 max-w-2xl text-marquee-textDim">
        Anime and movies tagged {genre}, pulled from the current catalog.
      </p>
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
