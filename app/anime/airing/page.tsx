import Link from "next/link";

export const metadata = {
  title: "Airing Anime — Marquee",
  description: "Airing anime to follow right now.",
};

export default function AiringAnimePage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <p className="font-mono text-xs tracking-[0.3em] text-marquee-gold">🍥 AIRING</p>
      <h1 className="mt-3 font-display text-5xl text-marquee-text">Airing anime</h1>
      <p className="mt-4 text-marquee-textDim">The route is in place and ready for live data.</p>
      <div className="mt-8">
        <Link href="/anime" className="rounded border border-marquee-line px-4 py-2 text-marquee-text">Back to anime hub</Link>
      </div>
    </div>
  );
}
