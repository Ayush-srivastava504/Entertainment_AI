import Link from "next/link";

const sections = [
  { href: "/anime/trending", label: "Trending" },
  { href: "/anime/popular", label: "Popular" },
  { href: "/anime/top-rated", label: "Top rated" },
  { href: "/anime/upcoming", label: "Upcoming" },
  { href: "/anime/airing", label: "Airing" },
  { href: "/anime/search", label: "Search" },
];

export const metadata = {
  title: "Anime — Marquee",
  description: "Browse anime by trend, popularity, season, and more.",
};

export default function AnimePage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <p className="font-mono text-xs tracking-[0.3em] text-marquee-gold">🍥 ANIME</p>
      <h1 className="mt-3 font-display text-5xl text-marquee-text">Anime hub</h1>
      <p className="mt-4 max-w-2xl text-marquee-textDim">
        Jump into curated anime browse paths without the old AI-only experience.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link key={section.href} href={section.href} className="ticket p-6 hover:border-marquee-gold transition-colors">
            <h2 className="font-display text-2xl text-marquee-text">{section.label}</h2>
          </Link>
        ))}
      </div>
    </div>
  );
}
