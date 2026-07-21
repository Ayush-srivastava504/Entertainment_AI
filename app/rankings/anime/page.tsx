import Link from "next/link";
import { getAnimeRankings } from "@/lib/api/jikan";

export const revalidate = 3600;

export const metadata = {
  title: "Anime Rankings — Marquee",
  description: "Popular anime rankings curated for fans and newcomers.",
};

type AnimeRankingsPageProps = {
  searchParams?: Promise<{ page?: string | string[] | undefined }>;
};

export default async function AnimeRankingsPage({ searchParams }: AnimeRankingsPageProps) {
  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams?.page ?? 1);
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const rankings = await getAnimeRankings(safePage, 20);
  const totalPages = 5;

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <p className="font-mono text-xs tracking-[0.3em] text-marquee-gold">⭐ anime</p>
      <h1 className="mt-3 font-display text-5xl text-marquee-text">Top 100 anime</h1>
      <p className="mt-3 max-w-2xl text-marquee-textDim">A permanent top-100 ranking view powered by Jikan data.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rankings.map((ranking, index) => (
          <Link key={ranking.id} href={`/anime/${ranking.id}`} className="ticket p-5 hover:border-marquee-gold transition-colors">
            <p className="font-mono text-xs text-marquee-gold">#{(safePage - 1) * 20 + index + 1}</p>
            <h2 className="mt-2 font-display text-2xl text-marquee-text">{ranking.title}</h2>
            <p className="mt-2 text-sm text-marquee-textDim">{ranking.description}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {safePage > 1 ? (
          <Link href={`/rankings/anime?page=${safePage - 1}`} className="rounded border border-marquee-line px-3 py-2 text-sm text-marquee-text">
            ← Previous
          </Link>
        ) : (
          <span className="rounded border border-marquee-line px-3 py-2 text-sm text-marquee-textDim">← Previous</span>
        )}

        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
          <Link
            key={pageNumber}
            href={`/rankings/anime?page=${pageNumber}`}
            className={`rounded px-3 py-2 text-sm ${pageNumber === safePage ? "bg-marquee-gold text-marquee-bg" : "border border-marquee-line text-marquee-text"}`}
          >
            {pageNumber}
          </Link>
        ))}

        {safePage < totalPages ? (
          <Link href={`/rankings/anime?page=${safePage + 1}`} className="rounded border border-marquee-line px-3 py-2 text-sm text-marquee-text">
            Next →
          </Link>
        ) : (
          <span className="rounded border border-marquee-line px-3 py-2 text-sm text-marquee-textDim">Next →</span>
        )}
      </div>
    </div>
  );
}
