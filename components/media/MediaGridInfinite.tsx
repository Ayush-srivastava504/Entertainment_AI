"use client";

import { useState } from "react";
import { MediaGrid } from "@/components/media/MediaGrid";
import type { MediaItem } from "@/lib/api/normalize";

/*
Client-side "Load more" wrapper around MediaGrid. Section pages render the
first page on the server (fast first paint, good SEO) and hand it to this
component along with the section/query so further pages can be fetched from
the existing /api/anime or /api/movies routes as the user asks for more,
instead of every section page being capped at a single hardcoded page.
*/

export function MediaGridInfinite({
  kind,
  section,
  query = "",
  genre = "",
  initialItems,
  initialPage = 1,
  pageSize = 24,
  basePath,
}: {
  kind: "anime" | "movie";
  section: string;
  query?: string;
  genre?: string;
  initialItems: MediaItem[];
  initialPage?: number;
  pageSize?: number;
  basePath: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(initialItems.length < pageSize);
  const [error, setError] = useState(false);

  const apiPath = kind === "anime" ? "/api/anime" : "/api/movies";

  async function loadMore() {
    if (loading || done) return;
    setLoading(true);
    setError(false);
    const nextPage = page + 1;
    try {
      const params = new URLSearchParams({
        section,
        page: String(nextPage),
        limit: String(pageSize),
      });
      if (query) params.set("q", query);
      if (genre) params.set("genre", genre);
      const res = await fetch(`${apiPath}?${params.toString()}`);
      if (!res.ok) throw new Error(`request failed: ${res.status}`);
      const data = await res.json();
      const newItems: MediaItem[] = data.items ?? [];

      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...newItems.filter((n) => !seen.has(n.id))];
      });
      setPage(nextPage);
      if (newItems.length < pageSize) setDone(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <MediaGrid items={items} basePath={basePath} />

      {items.length === 0 && (
        <p className="mt-6 text-marquee-textDim">Nothing here yet — check back after the next sync.</p>
      )}

      {!done && items.length > 0 && (
        <div className="mt-10 flex flex-col items-center gap-2">
          <button
            onClick={loadMore}
            disabled={loading}
            className="rounded border border-marquee-line px-6 py-2.5 text-sm font-semibold text-marquee-text transition hover:border-marquee-gold disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
          {error && (
            <p className="text-xs text-red-400">Couldn&apos;t load more right now — try again.</p>
          )}
        </div>
      )}
    </div>
  );
}
