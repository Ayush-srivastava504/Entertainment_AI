"use client";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-marquee-text">
      <h2 className="font-display text-3xl text-marquee-text">Something went wrong.</h2>
      <p className="mt-3 text-marquee-textDim">
        The marquee hit a snag while loading this page.
      </p>
      <button
        onClick={() => reset()}
        className="mt-6 rounded bg-marquee-gold px-4 py-2 font-semibold text-marquee-bg"
      >
        Try again
      </button>
    </div>
  );
}
