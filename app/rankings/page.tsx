import Link from "next/link";

const hubs = [
  {
    href: "/rankings/anime",
    title: "Anime Rankings",
    description: "Browse curated top anime lists and category snapshots.",
  },
  {
    href: "/rankings/movies",
    title: "Movie Rankings",
    description: "Explore movie rankings with a polished, shareable layout.",
  },
  {
    href: "/rankings/genre/action",
    title: "Genre Browse",
    description: "Jump into genre-powered discovery across anime and movies.",
  },
];

export const metadata = {
  title: "Rankings — Marquee",
  description: "Top-rated anime and movie lists, organized for quick browsing.",
};

export default function RankingsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <p className="font-mono text-xs tracking-[0.3em] text-marquee-gold">⭐ RANKINGS</p>
      <h1 className="mt-3 font-display text-5xl text-marquee-text">Rankings Hub</h1>
      <p className="mt-4 max-w-2xl text-marquee-textDim">
        Keep the marquee moving with curated collections that can be browsed by category or genre.
      </p>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {hubs.map((hub) => (
          <Link key={hub.href} href={hub.href} className="ticket p-6 hover:border-marquee-gold transition-colors">
            <h2 className="font-display text-2xl text-marquee-text">{hub.title}</h2>
            <p className="mt-2 text-sm text-marquee-textDim">{hub.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
