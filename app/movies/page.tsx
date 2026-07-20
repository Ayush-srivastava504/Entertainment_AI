"use client";

import ToolShell from "@/components/ToolShell";

export default function MoviesPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="font-mono text-xs text-marquee-gold tracking-marquee mb-2">
        🎬 MOVIES
      </p>
      <h1 className="font-display text-5xl text-marquee-text mb-3">
        AI Movie Recommender
      </h1>
      <p className="text-marquee-textDim mb-8">
        Try: “like Interstellar but happier”, “date night, nothing too heavy”,
        or “hidden gems from the 90s.”
      </p>
      <ToolShell
        task="movie-recommend"
        placeholder="Describe the mood, not just the genre…"
        submitLabel="Recommend movies"
        buildInput={(fd) => ({ query: String(fd.get("query") || "") })}
      />
    </div>
  );
}
