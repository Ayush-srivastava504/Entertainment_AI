"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Row {
  id: string;
  slug: string;
  title: string;
  contentType: "anime" | "movie";
  contentId: string;
  posterUrl: string | null;
  cards: { heading: string; text: string }[];
  publishedAt: string;
}

export default function ShortsListTable() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const limit = 25;

  function load() {
    const params = new URLSearchParams({ page: String(page) });
    if (query.trim()) params.set("q", query.trim());
    fetch(`/api/admin/shorts?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setRows(data.rows ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => setRows([]));
  }

  useEffect(load, [page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <div className="flex items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setPage(1);
              load();
            }
          }}
          placeholder="Search by title..."
          className="w-full max-w-xs rounded border border-marquee-line bg-transparent px-3 py-2 text-sm text-marquee-text placeholder:text-marquee-textDim focus-ring"
        />
        <Link
          href="/admin/shorts/new"
          className="shrink-0 rounded bg-marquee-gold px-4 py-2 text-sm font-semibold text-marquee-bg focus-ring"
        >
          + New short
        </Link>
      </div>

      <div className="mt-6">
        {rows === null && <p className="text-sm text-marquee-textDim">Loading...</p>}
        {rows?.length === 0 && (
          <p className="text-sm text-marquee-textDim">
            No shorts yet. Create one manually, or run <code className="text-marquee-gold">npm run crawl:shorts</code>.
          </p>
        )}
        <div className="space-y-2">
          {rows?.map((r) => (
            <Link
              key={r.id}
              href={`/admin/shorts/${r.id}`}
              className="ticket flex items-center gap-4 p-3 transition hover:border-marquee-gold"
            >
              <div className="h-14 w-10 shrink-0 overflow-hidden rounded bg-marquee-panel">
                {r.posterUrl && <img src={r.posterUrl} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-marquee-text">{r.title}</p>
                <p className="text-xs text-marquee-textDim">
                  {r.contentType} · {r.cards.length} card{r.cards.length === 1 ? "" : "s"} ·{" "}
                  {new Date(r.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm text-marquee-textDim">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded border border-marquee-line px-3 py-1 disabled:opacity-40 focus-ring"
          >
            Prev
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded border border-marquee-line px-3 py-1 disabled:opacity-40 focus-ring"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
