"use client";

import { useRouter } from "next/navigation";
import { GENRES } from "@/lib/genres";

export function GenreFilter({ basePath }: { basePath: "/genres" }) {
  const router = useRouter();

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <label htmlFor="genre-filter" className="font-mono text-xs uppercase tracking-[0.25em] text-marquee-gold">
        Filter by genre
      </label>
      <select
        id="genre-filter"
        defaultValue=""
        onChange={(event) => {
          const value = event.target.value;
          if (value) router.push(`${basePath}/${value}`);
        }}
        className="rounded border border-marquee-line bg-marquee-panel px-3 py-2 text-sm text-marquee-text focus-ring"
      >
        <option value="" disabled>
          Choose a genre…
        </option>
        {GENRES.map((g) => (
          <option key={g.slug} value={g.slug}>
            {g.label}
          </option>
        ))}
      </select>
    </div>
  );
}
