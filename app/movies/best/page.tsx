import Link from "next/link";
import { movieRankings } from "@/lib/content/rankings";

export const metadata = {
  title: "Best Movie Rankings — Marquee",
  description: "Curated movie rankings by genre, mood, and platform.",
};

export default function MovieRankingsIndex() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="font-mono text-xs text-marquee-gold tracking-marquee mb-2">
        ⭐ RANKINGS
      </p>
      <h1 className="font-display text-5xl text-marquee-text mb-8">
        Best Movie Rankings
      </h1>
      <div className="grid sm:grid-cols-2 gap-5">
        {movieRankings.map((r) => (
          <Link
            key={r.slug}
            href={`/movies/best/${r.slug}`}
            className="ticket p-6 pl-8 hover:border-marquee-gold transition-colors focus-ring"
          >
            <h2 className="font-display text-2xl text-marquee-text mb-1">
              {r.title}
            </h2>
            <p className="text-sm text-marquee-textDim">{r.metaDescription}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
