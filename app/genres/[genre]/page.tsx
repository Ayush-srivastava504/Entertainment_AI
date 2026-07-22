import Link from "next/link";
import { notFound } from "next/navigation";

const allowedGenres = ["action", "comedy", "drama", "fantasy", "horror", "romance", "thriller"];

export const metadata = {
  title: "Genre Browse — Marquee",
  description: "Browse anime and movie picks by genre.",
};

export default async function GenreBrowsePage({ params }: { params: Promise<{ genre: string }> }) {
  const { genre } = await params;
  if (!allowedGenres.includes(genre)) notFound();

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <p className="font-mono text-xs tracking-[0.3em] text-marquee-gold">🎯 GENRE</p>
      <h1 className="mt-3 font-display text-3xl sm:text-5xl text-marquee-text">{genre} picks</h1>
      <p className="mt-4 text-marquee-textDim">
        This page is wired up as a dedicated genre hub for the next content integration pass.
      </p>
      <div className="mt-8 flex gap-4">
        <Link href="/anime" className="rounded border border-marquee-line px-4 py-2 text-marquee-text">Anime hub</Link>
        <Link href="/movies" className="rounded border border-marquee-line px-4 py-2 text-marquee-text">Movies hub</Link>
      </div>
    </div>
  );
}
