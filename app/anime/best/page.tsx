import Link from "next/link";
import { getRankings } from "@/lib/db";

export const metadata = {
  title: "Best Anime Rankings — Marquee",
  description: "Curated anime rankings by genre, mood, and vibe.",
};

export const revalidate = 3600;

export default async function AnimeRankingsIndex() {
  const rankings = await getRankings("anime");

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="font-mono text-xs text-marquee-gold tracking-marquee mb-2">
        ⭐ RANKINGS
      </p>
      <h1 className="font-display text-5xl text-marquee-text mb-8">
        Best Anime Rankings
      </h1>
      {rankings.length === 0 && (
        <p className="text-marquee-textDim">
          Nothing published yet — check back after the next daily run.
        </p>
      )}
      <div className="grid sm:grid-cols-2 gap-5">
        {rankings.map((r) => (
          <Link
            key={r.slug}
            href={`/anime/best/${r.slug}`}
            className="ticket p-6 pl-8 hover:border-marquee-gold transition-colors focus-ring"
          >
            <h2 className="font-display text-2xl text-marquee-text mb-1">
              {r.title}
            </h2>
            <p className="text-sm text-marquee-textDim">{r.meta_description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
