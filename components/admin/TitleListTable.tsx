"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TitleKind } from "@/lib/admin-db";

interface Row {
  id: string;
  slug: string;
  title: string;
  year: number | null;
  score: number | null;
  posterUrl: string | null;
  noindex: boolean;
  featured: boolean;
  hasSynopsisOverride: boolean;
  hasThinDescription: boolean;
}

type Filter = "all" | "thin" | "noindex" | "featured";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "thin", label: "Thin description" },
  { value: "noindex", label: "Noindexed" },
  { value: "featured", label: "Featured" },
];

export default function TitleListTable({ kind }: { kind: TitleKind }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [query, filter]);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), filter });
    if (query.trim()) params.set("q", query.trim());
    const controller = new AbortController();

    fetch(`/api/admin/titles/${kind}?${params}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        setRows(data.rows ?? []);
        setTotal(data.total ?? 0);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setRows([]);
      });

    return () => controller.abort();
  }, [kind, query, filter, page]);

  const limit = 25;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${kind} titles...`}
          className="w-64 rounded border border-marquee-line bg-transparent px-3 py-2 text-sm text-marquee-text placeholder:text-marquee-textDim focus-ring"
        />
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded border px-3 py-1.5 text-xs focus-ring ${
                filter === f.value
                  ? "border-marquee-gold text-marquee-gold"
                  : "border-marquee-line text-marquee-textDim hover:text-marquee-text"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-marquee-textDim">{total.toLocaleString()} titles</span>
      </div>

      <div className="mt-4 overflow-hidden rounded border border-marquee-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-marquee-line bg-marquee-panel text-left text-xs uppercase tracking-wide text-marquee-textDim">
              <th className="px-4 py-2 font-normal">Title</th>
              <th className="px-4 py-2 font-normal">Year</th>
              <th className="px-4 py-2 font-normal">Score</th>
              <th className="px-4 py-2 font-normal">Status</th>
              <th className="px-4 py-2 font-normal" />
            </tr>
          </thead>
          <tbody>
            {rows === null && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-marquee-textDim">
                  Loading...
                </td>
              </tr>
            )}
            {rows?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-marquee-textDim">
                  No titles match.
                </td>
              </tr>
            )}
            {rows?.map((row) => (
              <tr key={row.id} className="border-b border-marquee-line/50 last:border-0">
                <td className="px-4 py-2 text-marquee-text">{row.title}</td>
                <td className="px-4 py-2 text-marquee-textDim">{row.year ?? "—"}</td>
                <td className="px-4 py-2 text-marquee-textDim">{row.score?.toFixed(1) ?? "—"}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {row.noindex && (
                      <span className="rounded bg-red-950 px-2 py-0.5 text-xs text-red-300">noindex</span>
                    )}
                    {row.featured && (
                      <span className="rounded bg-marquee-gold/20 px-2 py-0.5 text-xs text-marquee-gold">
                        featured
                      </span>
                    )}
                    {row.hasSynopsisOverride && (
                      <span className="rounded border border-marquee-line px-2 py-0.5 text-xs text-marquee-textDim">
                        override
                      </span>
                    )}
                    {row.hasThinDescription && !row.hasSynopsisOverride && (
                      <span className="rounded border border-marquee-line px-2 py-0.5 text-xs text-marquee-textDim">
                        thin
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/admin/${kind === "anime" ? "anime" : "movies"}/${row.id}`}
                    className="text-xs text-marquee-gold hover:underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
