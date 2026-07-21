import Link from "next/link";

const sections = [
  { href: "/movies/trending", label: "Trending" },
  { href: "/movies/popular", label: "Popular" },
  { href: "/movies/top-rated", label: "Top rated" },
  { href: "/movies/upcoming", label: "Upcoming" },
  { href: "/movies/latest", label: "Latest" },
  { href: "/movies/search", label: "Search" },
];

export const metadata = {
  title: "Movies — Marquee",
  description: "Browse movies by trend, popularity, release date, and more.",
};

export default function MoviesPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <p className="font-mono text-xs tracking-[0.3em] text-marquee-gold">🎬 MOVIES</p>
      <h1 className="mt-3 font-display text-5xl text-marquee-text">Movies hub</h1>
      <p className="mt-4 max-w-2xl text-marquee-textDim">
        Travel through the movie marquee with dedicated browsing routes for every mood and release window.
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
