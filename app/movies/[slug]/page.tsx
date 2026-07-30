import Link from "next/link";
import { notFound } from "next/navigation";
import { getMovieById } from "@/lib/api/movies";

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.marquees.site").replace(/\/$/, "");

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const movie = await getMovieById(slug);
  if (!movie) return {};

  const url = `${BASE_URL}/movies/${slug}`;
  const title = movie.year ? `${movie.title} (${movie.year}) — Marquee` : `${movie.title} — Marquee`;
  const description = movie.description || `Details, rating, and genres for ${movie.title}.`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: movie.title,
      description,
      url,
      type: "video.movie",
      images: movie.posterUrl ? [{ url: movie.posterUrl }] : undefined,
    },
    twitter: {
      card: movie.posterUrl ? "summary_large_image" : "summary",
      title: movie.title,
      description,
      images: movie.posterUrl ? [movie.posterUrl] : undefined,
    },
  };
}

export default async function MovieDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const movie = await getMovieById(slug);
  if (!movie) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title,
    datePublished: movie.year ? String(movie.year) : undefined,
    image: movie.posterUrl || undefined,
    description: movie.description || undefined,
    genre: movie.genres,
    ...(movie.score ? { aggregateRating: { "@type": "AggregateRating", ratingValue: movie.score, bestRating: 10 } } : {}),
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="overflow-hidden rounded border border-marquee-line bg-marquee-panel">
          {movie.posterUrl ? <img src={movie.posterUrl} alt={movie.title} className="h-full w-full object-cover" /> : <div className="p-8 text-sm text-marquee-textDim">No poster</div>}
        </div>
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-marquee-gold">🎬 detail</p>
          <h1 className="mt-3 font-display text-3xl sm:text-5xl text-marquee-text">{movie.title}</h1>
          <p className="mt-4 text-marquee-textDim">{movie.description}</p>
          <div className="mt-6 flex flex-wrap gap-2 text-sm text-marquee-textDim">
            {movie.year ? <span className="rounded border border-marquee-line px-3 py-1">{movie.year}</span> : null}
            {movie.score ? <span className="rounded border border-marquee-line px-3 py-1">★ {movie.score.toFixed(1)}</span> : null}
            {movie.genres.map((genre) => <span key={genre} className="rounded border border-marquee-line px-3 py-1">{genre}</span>)}
          </div>

          {movie.watchProviders && (movie.watchProviders.flatrate.length > 0 || movie.watchProviders.rent.length > 0 || movie.watchProviders.buy.length > 0) && (
            <div className="mt-8">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-marquee-gold mb-3">Where to watch{movie.watchProviders.region ? ` (${movie.watchProviders.region})` : ""}</p>
              {[
                { label: "Stream", list: movie.watchProviders.flatrate },
                { label: "Rent", list: movie.watchProviders.rent },
                { label: "Buy", list: movie.watchProviders.buy },
              ]
                .filter((group) => group.list.length > 0)
                .map((group) => (
                  <div key={group.label} className="mb-3 flex flex-wrap items-center gap-2 text-sm text-marquee-textDim">
                    <span className="w-14 shrink-0">{group.label}</span>
                    {group.list.map((p) => (
                      <span key={p.name} className="flex items-center gap-1.5 rounded border border-marquee-line px-2.5 py-1">
                        {p.logo && <img src={p.logo} alt="" className="h-4 w-4 rounded-sm" />}
                        {p.name}
                      </span>
                    ))}
                  </div>
                ))}
              {movie.watchProviders.link && (
                <a href={movie.watchProviders.link} target="_blank" rel="noreferrer" className="text-xs text-marquee-gold hover:underline">
                  Full list on TMDB →
                </a>
              )}
            </div>
          )}

          <div className="mt-8">
            <Link href="/movies" className="rounded border border-marquee-line px-4 py-2 text-marquee-text">Back to movies hub</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
