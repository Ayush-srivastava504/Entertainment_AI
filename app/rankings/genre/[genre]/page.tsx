import Link from "next/link";
import { notFound } from "next/navigation";
import { getAnimeByGenre } from "@/lib/api/jikan";
import { getMovieByGenre } from "@/lib/api/tmdb";

const allowedGenres = ["action", "comedy", "drama", "fantasy", "horror", "romance", "thriller"];

export const metadata = {
  title: "Genre Rankings — Marquee",
  description: "Browse rankings by genre across anime and movies.",
};

type GenreRankingPageProps = {
  params: Promise<{ genre: string }>;
  searchParams?: Promise<{ page?: string | string[] | undefined }>;
};

export default async function GenreRankingPage({ params, searchParams }: GenreRankingPageProps) {
  const { genre } = await params;
  if (!allowedGenres.includes(genre)) notFound();

  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams?.page ?? 1);
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const [animeItems, movieItems] = await Promise.all([
    getAnimeByGenre(genre, safePage, 12),
    getMovieByGenre(genre, safePage, 12),
  ]);
  const totalPages = 5;

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <p className="font-mono text-xs tracking-[0.3em] text-marquee-gold">⭐ genre</p>
      <h1 className="mt-3 font-display text-5xl text-marquee-text">{genre} rankings</h1>
      <p className="mt-4 max-w-2xl text-marquee-textDim">
        A blended genre ranking view for anime and movies, using the same normalized media cards as the rest of the experience.
      </p>
      <div className="mt-8 flex gap-4">
        <Link href="/rankings/anime" className="rounded border border-marquee-line px-4 py-2 text-marquee-text">Browse anime rankings</Link>
        <Link href="/rankings/movies" className="rounded border border-marquee-line px-4 py-2 text-marquee-text">Browse movie rankings</Link>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="font-display text-3xl text-marquee-text">Anime</h2>
          <div className="mt-4 grid gap-4">
            {animeItems.map((item, index) => (
              <Link key={item.id} href={`/anime/${item.id}`} className="ticket p-4 hover:border-marquee-gold transition-colors">
                <p className="font-mono text-xs text-marquee-gold">#{(safePage - 1) * 12 + index + 1}</p>
                <h3 className="mt-1 font-display text-xl text-marquee-text">{item.title}</h3>
                <p className="mt-2 text-sm text-marquee-textDim">{item.description}</p>
              </Link>
            ))}
          </div>
        </section>
        <section>
          <h2 className="font-display text-3xl text-marquee-text">Movies</h2>
          <div className="mt-4 grid gap-4">
            {movieItems.map((item, index) => (
              <Link key={item.id} href={`/movies/${item.id}`} className="ticket p-4 hover:border-marquee-gold transition-colors">
                <p className="font-mono text-xs text-marquee-gold">#{(safePage - 1) * 12 + index + 1}</p>
                <h3 className="mt-1 font-display text-xl text-marquee-text">{item.title}</h3>
                <p className="mt-2 text-sm text-marquee-textDim">{item.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {safePage > 1 ? (
          <Link href={`/rankings/genre/${genre}?page=${safePage - 1}`} className="rounded border border-marquee-line px-3 py-2 text-sm text-marquee-text">
            ← Previous
          </Link>
        ) : (
          <span className="rounded border border-marquee-line px-3 py-2 text-sm text-marquee-textDim">← Previous</span>
        )}

        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
          <Link
            key={pageNumber}
            href={`/rankings/genre/${genre}?page=${pageNumber}`}
            className={`rounded px-3 py-2 text-sm ${pageNumber === safePage ? "bg-marquee-gold text-marquee-bg" : "border border-marquee-line text-marquee-text"}`}
          >
            {pageNumber}
          </Link>
        ))}

        {safePage < totalPages ? (
          <Link href={`/rankings/genre/${genre}?page=${safePage + 1}`} className="rounded border border-marquee-line px-3 py-2 text-sm text-marquee-text">
            Next →
          </Link>
        ) : (
          <span className="rounded border border-marquee-line px-3 py-2 text-sm text-marquee-textDim">Next →</span>
        )}
      </div>
    </div>
  );
}
