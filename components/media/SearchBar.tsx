"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBar({ initialValue, path }: { initialValue?: string; path: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialValue ?? "");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        router.push(`${path}?${params.toString()}`);
      }}
      className="flex flex-col gap-3 sm:flex-row"
    >
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by title"
        className="w-full rounded border border-marquee-line bg-marquee-panel px-4 py-3 text-marquee-text outline-none focus:border-marquee-gold"
      />
      <button type="submit" className="rounded bg-marquee-gold px-4 py-3 font-semibold text-marquee-bg">
        Search
      </button>
    </form>
  );
}
