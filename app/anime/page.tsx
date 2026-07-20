"use client";

import ToolShell from "@/components/ToolShell";

export default function AnimePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="font-mono text-xs text-marquee-gold tracking-marquee mb-2">
        🍥 ANIME
      </p>
      <h1 className="font-display text-5xl text-marquee-text mb-3">
        AI Anime Finder
      </h1>
      <p className="text-marquee-textDim mb-8">
        Describe a character, plot beat, or vibe — not a title.
      </p>
      <ToolShell
        task="anime-find"
        placeholder="e.g. main character has white hair and fights demons"
        submitLabel="Find anime"
        buildInput={(fd) => ({ query: String(fd.get("query") || "") })}
      />
    </div>
  );
}
