import Link from "next/link";

export const metadata = {
  title: "Search — Marquee",
  description: "Search across movies, anime, blog posts, and quizzes.",
};

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <p className="font-mono text-xs tracking-[0.3em] text-marquee-gold">🔎 SEARCH</p>
      <h1 className="mt-3 font-display text-3xl sm:text-5xl text-marquee-text">Global search</h1>
      <p className="mt-4 text-marquee-textDim">
        Search is ready for the next integration pass with the unified API endpoint.
      </p>
      <div className="mt-8 flex gap-4">
        <Link href="/anime" className="rounded border border-marquee-line px-4 py-2 text-marquee-text">Explore anime</Link>
        <Link href="/movies" className="rounded border border-marquee-line px-4 py-2 text-marquee-text">Explore movies</Link>
      </div>
    </div>
  );
}
