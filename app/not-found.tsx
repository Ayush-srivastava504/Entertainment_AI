import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-marquee-text">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-marquee-gold">404</p>
      <h2 className="mt-3 font-display text-4xl">This marquee frame is empty.</h2>
      <p className="mt-3 text-marquee-textDim">
        The page you requested is not part of the current marquee yet.
      </p>
      <Link href="/" className="mt-6 inline-block rounded bg-marquee-gold px-4 py-2 font-semibold text-marquee-bg">
        Back home
      </Link>
    </div>
  );
}
