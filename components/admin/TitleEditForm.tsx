"use client";

import { useState } from "react";
import Link from "next/link";
import type { TitleKind } from "@/lib/admin-db";

interface TitleDetail {
  id: string;
  slug: string;
  title: string;
  year: number | null;
  score: number | null;
  posterUrl: string | null;
  noindex: boolean;
  featured: boolean;
  description: string | null;
  synopsisOverride: string | null;
  genres: string[];
}

export default function TitleEditForm({ kind, title }: { kind: TitleKind; title: TitleDetail }) {
  const [noindex, setNoindex] = useState(title.noindex);
  const [featured, setFeatured] = useState(title.featured);
  const [synopsisOverride, setSynopsisOverride] = useState(title.synopsisOverride ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const publicHref = `/${kind === "anime" ? "anime" : "movies"}/${title.slug}`;

  async function handleSave() {
    setStatus("saving");
    try {
      const res = await fetch(`/api/admin/titles/${kind}/${title.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noindex, featured, synopsisOverride }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1500);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div>
      <div className="flex items-start gap-6">
        <div className="w-32 shrink-0 overflow-hidden rounded border border-marquee-line bg-marquee-panel">
          {title.posterUrl ? (
            <img src={title.posterUrl} alt={title.title} className="w-full object-cover" />
          ) : (
            <div className="p-4 text-xs text-marquee-textDim">No poster</div>
          )}
        </div>
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-marquee-gold">{kind}</p>
          <h1 className="mt-1 font-display text-2xl text-marquee-text">{title.title}</h1>
          <p className="mt-1 text-sm text-marquee-textDim">
            {title.year ?? "—"} · {title.score?.toFixed(1) ?? "no score"} · {title.genres.join(", ") || "no genres"}
          </p>
          <Link href={publicHref} target="_blank" className="mt-2 inline-block text-xs text-marquee-gold hover:underline">
            View public page →
          </Link>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-marquee-text">
            <input
              type="checkbox"
              checked={noindex}
              onChange={(e) => setNoindex(e.target.checked)}
              className="h-4 w-4 accent-marquee-gold"
            />
            Noindex (hide from Google + sitemap)
          </label>
          <label className="flex items-center gap-2 text-sm text-marquee-text">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="h-4 w-4 accent-marquee-gold"
            />
            Featured
          </label>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-marquee-textDim">Original source description</p>
          <p className="mt-1 rounded border border-marquee-line bg-marquee-panel p-3 text-sm text-marquee-textDim">
            {title.description || "(empty)"}
          </p>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-marquee-textDim">
            Synopsis override (shown on the public page instead of the source description, if set)
          </label>
          <textarea
            value={synopsisOverride}
            onChange={(e) => setSynopsisOverride(e.target.value)}
            rows={6}
            maxLength={2000}
            placeholder="Write a real synopsis — cast notes, standout scenes, why it's worth watching..."
            className="mt-2 w-full rounded border border-marquee-line bg-transparent px-3 py-2 text-sm text-marquee-text placeholder:text-marquee-textDim focus-ring"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={status === "saving"}
            className="rounded bg-marquee-gold px-4 py-2 text-sm font-semibold text-marquee-bg disabled:opacity-50 focus-ring"
          >
            {status === "saving" ? "Saving..." : "Save changes"}
          </button>
          {status === "saved" && <span className="text-sm text-marquee-gold">Saved.</span>}
          {status === "error" && <span className="text-sm text-red-400">Could not save. Try again.</span>}
        </div>
      </div>
    </div>
  );
}
