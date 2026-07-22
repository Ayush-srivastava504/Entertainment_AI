import Link from "next/link";
import { notFound } from "next/navigation";
import { getAnimeById } from "@/lib/api/anime";

export const metadata = {
  title: "Anime Detail — Marquee",
  description: "Anime detail route placeholder.",
};

export default async function AnimeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const anime = await getAnimeById(slug);
  if (!anime) notFound();

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="overflow-hidden rounded border border-marquee-line bg-marquee-panel">
          {anime.posterUrl ? <img src={anime.posterUrl} alt={anime.title} className="h-full w-full object-cover" /> : <div className="p-8 text-sm text-marquee-textDim">No poster</div>}
        </div>
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-marquee-gold">🍥 detail</p>
          <h1 className="mt-3 font-display text-5xl text-marquee-text">{anime.title}</h1>
          <p className="mt-4 text-marquee-textDim">{anime.description}</p>
          <div className="mt-6 flex flex-wrap gap-2 text-sm text-marquee-textDim">
            {anime.year ? <span className="rounded border border-marquee-line px-3 py-1">{anime.year}</span> : null}
            {anime.score ? <span className="rounded border border-marquee-line px-3 py-1">★ {anime.score.toFixed(1)}</span> : null}
            {anime.genres.map((genre) => <span key={genre} className="rounded border border-marquee-line px-3 py-1">{genre}</span>)}
          </div>
          <div className="mt-8">
            <Link href="/anime" className="rounded border border-marquee-line px-4 py-2 text-marquee-text">Back to anime hub</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
