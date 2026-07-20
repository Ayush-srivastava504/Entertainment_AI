"use client";

import ToolShell from "@/components/ToolShell";

export default function StoriesPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="font-mono text-xs text-marquee-gold tracking-marquee mb-2">
        📖 STORIES
      </p>
      <h1 className="font-display text-5xl text-marquee-text mb-3">
        AI Story Generator
      </h1>
      <p className="text-marquee-textDim mb-8">
        Set the genre, the lead character, and how it ends.
      </p>
      <ToolShell
        task="story-generate"
        showTextarea={false}
        submitLabel="Write the story"
        extraFields={
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-sm text-marquee-textDim">
              Genre
              <select
                name="genre"
                defaultValue="Fantasy"
                className="mt-1 w-full rounded border border-marquee-line bg-marquee-panel px-3 py-2 text-marquee-text focus-ring outline-none"
              >
                <option>Fantasy</option>
                <option>Sci-Fi</option>
                <option>Horror</option>
                <option>Romance</option>
                <option>Mystery</option>
                <option>Comedy</option>
              </select>
            </label>
            <label className="block text-sm text-marquee-textDim">
              Ending
              <select
                name="ending"
                defaultValue="Bittersweet"
                className="mt-1 w-full rounded border border-marquee-line bg-marquee-panel px-3 py-2 text-marquee-text focus-ring outline-none"
              >
                <option>Happy</option>
                <option>Bittersweet</option>
                <option>Tragic</option>
                <option>Twist</option>
                <option>Open-ended</option>
              </select>
            </label>
            <label className="block text-sm text-marquee-textDim sm:col-span-2">
              Main character
              <input
                name="character"
                required
                placeholder="e.g. a retired lighthouse keeper who can talk to storms"
                className="mt-1 w-full rounded border border-marquee-line bg-marquee-panel px-3 py-2 text-marquee-text placeholder:text-marquee-textDim focus-ring outline-none"
              />
            </label>
            <label className="block text-sm text-marquee-textDim">
              Length
              <select
                name="length"
                defaultValue="400"
                className="mt-1 w-full rounded border border-marquee-line bg-marquee-panel px-3 py-2 text-marquee-text focus-ring outline-none"
              >
                <option value="200">Short (~200 words)</option>
                <option value="400">Medium (~400 words)</option>
                <option value="700">Long (~700 words)</option>
              </select>
            </label>
          </div>
        }
        buildInput={(fd) => ({
          genre: String(fd.get("genre") || "Fantasy"),
          character: String(fd.get("character") || ""),
          ending: String(fd.get("ending") || "Bittersweet"),
          length: String(fd.get("length") || "400"),
        })}
      />
    </div>
  );
}
