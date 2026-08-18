"use client";

import { useEffect, useState } from "react";

interface Row {
  id: string;
  contentType: string;
  contentSlug: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export default function CommentModeration() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 30;

  function load(p: number) {
    fetch(`/api/admin/comments?page=${p}`)
      .then((r) => r.json())
      .then((data) => {
        setRows(data.rows ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => setRows([]));
  }

  useEffect(() => load(page), [page]);

  async function handleDelete(id: string) {
    setRows((prev) => prev?.filter((r) => r.id !== id) ?? null);
    await fetch(`/api/admin/comments/${id}`, { method: "DELETE" }).catch(() => undefined);
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      {rows === null && <p className="text-sm text-marquee-textDim">Loading...</p>}
      {rows?.length === 0 && <p className="text-sm text-marquee-textDim">No comments yet.</p>}
      <div className="space-y-3">
        {rows?.map((c) => (
          <div key={c.id} className="ticket flex items-start justify-between gap-4 p-4">
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <p className="font-mono text-sm text-marquee-gold">{c.authorName}</p>
                <p className="text-xs text-marquee-textDim">
                  on {c.contentType}/{c.contentSlug}
                </p>
                <p className="text-xs text-marquee-textDim">
                  {new Date(c.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                </p>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-marquee-text">{c.body}</p>
            </div>
            <button
              onClick={() => handleDelete(c.id)}
              className="shrink-0 rounded border border-marquee-line px-3 py-1.5 text-xs text-red-300 hover:border-red-400 focus-ring"
            >
              Delete
            </button>
          </div>
        ))}
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
