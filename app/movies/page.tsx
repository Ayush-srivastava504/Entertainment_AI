import Link from "next/link";
import { GenreFilter } from "@/components/media/GenreFilter";
import { getRankings } from "@/lib/db";

const sections = [
  { href: "/movies/trending", label: "Trending" },
  { href: "/movies/popular", label: "Popular" },
  { href: "/movies/top-rated", label: "Top rated" },
  { href: "/movies/upcoming", label: "Upcoming" },
  { href: "/movies/latest", label: "Latest" },
  { href: "/movies/search", label: "Search" },
];

export const revalidate = 3600;

export const metadata = {
  title: "Movies — Marquee",
  description: "Browse movies by trend, popularity, release date, genre, and mood.",
};

export default async function MoviesPage() {
  const moodLists = await getRankings("movie", 12);

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <p className="font-mono text-xs tracking-[0.3em] text-marquee-gold">🎬 MOVIES</p>
      <h1 className="mt-3 font-display text-3xl sm:text-5xl text-marquee-text">Movies hub</h1>
      <p className="mt-4 max-w-2xl text-marquee-textDim">
        Travel through the movie marquee with dedicated browsing routes for every mood and release window.
      </p>
      <GenreFilter basePath="/genres" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link key={section.href} href={section.href} className="ticket p-6 hover:border-marquee-gold transition-colors">
            <h2 className="font-display text-2xl text-marquee-text">{section.label}</h2>
          </Link>
        ))}
      </div>

      {moodLists.length > 0 && (
        <>
          <h2 className="mt-14 mb-4 font-display text-2xl text-marquee-text">Moods &amp; curated lists</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {moodLists.map((list) => (
              <Link
                key={list.slug}
                href={`/rankings/movies/${list.slug}`}
                className="ticket p-5 hover:border-marquee-gold transition-colors"
              >
                <h3 className="font-display text-xl text-marquee-text">{list.title}</h3>
                <p className="mt-2 text-sm text-marquee-textDim">{list.meta_description}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
