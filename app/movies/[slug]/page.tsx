import Link from "next/link";
import { notFound } from "next/navigation";
import { getMovieById } from "@/lib/api/movies";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

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
          <div className="mt-8">
            <Link href="/movies" className="rounded border border-marquee-line px-4 py-2 text-marquee-text">Back to movies hub</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
