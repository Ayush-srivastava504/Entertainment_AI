import Link from "next/link";
import { GenreFilter } from "@/components/media/GenreFilter";
import { getRankings } from "@/lib/db";

const sections = [
  { href: "/anime/trending", label: "Trending" },
  { href: "/anime/popular", label: "Popular" },
  { href: "/anime/top-rated", label: "Top rated" },
  { href: "/anime/upcoming", label: "Upcoming" },
  { href: "/anime/airing", label: "Airing" },
  { href: "/anime/search", label: "Search" },
];

export const revalidate = 3600;

export const metadata = {
  title: "Anime — Marquee",
  description: "Browse anime by trend, popularity, season, genre, and mood.",
};

export default async function AnimePage() {
  const moodLists = await getRankings("anime", 12);

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <p className="font-mono text-xs tracking-[0.3em] text-marquee-gold">🍥 ANIME</p>
      <h1 className="mt-3 font-display text-3xl sm:text-5xl text-marquee-text">Anime hub</h1>
      <p className="mt-4 max-w-2xl text-marquee-textDim">
        Jump into curated anime browse paths without the old AI-only experience.
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
                href={`/rankings/anime/${list.slug}`}
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
