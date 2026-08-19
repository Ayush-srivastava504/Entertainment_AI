"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Card {
  heading: string;
  text: string;
}

export interface ShortDetail {
  id: string;
  title: string;
  contentType: "anime" | "movie";
  contentId: string;
  posterUrl: string | null;
  cards: Card[];
}

const EMPTY_CARD: Card = { heading: "", text: "" };
const MAX_CARDS = 6;

export default function ShortEditor({ existing }: { existing?: ShortDetail }) {
  const router = useRouter();
  const isNew = !existing;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [contentType, setContentType] = useState<"anime" | "movie">(existing?.contentType ?? "movie");
  const [contentId, setContentId] = useState(existing?.contentId ?? "");
  const [posterUrl, setPosterUrl] = useState(existing?.posterUrl ?? "");
  const [cards, setCards] = useState<Card[]>(existing?.cards?.length ? existing.cards : [{ ...EMPTY_CARD }, { ...EMPTY_CARD }]);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function updateCard(i: number, field: keyof Card, value: string) {
    setCards((prev) => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  }

  function addCard() {
    if (cards.length >= MAX_CARDS) return;
    setCards((prev) => [...prev, { ...EMPTY_CARD }]);
  }

  function removeCard(i: number) {
    setCards((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    setStatus("saving");
    setError(null);

    const cleanCards = cards
      .map((c) => ({ heading: c.heading.trim(), text: c.text.trim() }))
      .filter((c) => c.heading && c.text);

    if (!title.trim() || !contentId.trim() || cleanCards.length < 1) {
      setStatus("error");
      setError("Title, content ID, and at least one card with a heading + text are required.");
      return;
    }

    const payload = { title: title.trim(), contentType, contentId: contentId.trim(), posterUrl: posterUrl.trim() || null, cards: cleanCards };

    try {
      const res = await fetch(isNew ? "/api/admin/shorts" : `/api/admin/shorts/${existing!.id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus("error");
        setError(data.error ?? "Could not save.");
        return;
      }
      setStatus("saved");
      if (isNew) {
        const data = await res.json();
        router.push(`/admin/shorts/${data.short.id}`);
      } else {
        setTimeout(() => setStatus("idle"), 1500);
      }
    } catch {
      setStatus("error");
      setError("Network error — try again.");
    }
  }

  async function handleDelete() {
    if (!existing) return;
    if (!confirm(`Delete the "${existing.title}" short? This can't be undone.`)) return;
    await fetch(`/api/admin/shorts/${existing.id}`, { method: "DELETE" }).catch(() => undefined);
    router.push("/admin/shorts");
  }

  return (
    <div>
      <Link href="/admin/shorts" className="text-xs text-marquee-gold hover:underline">
        ← Back to shorts
      </Link>

      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        <div>
          <label className="text-xs uppercase tracking-wide text-marquee-textDim">Title (shown on the card stack)</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Attack on Titan"
            className="mt-2 w-full rounded border border-marquee-line bg-transparent px-3 py-2 text-sm text-marquee-text placeholder:text-marquee-textDim focus-ring"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-marquee-textDim">Poster URL (optional)</label>
          <input
            value={posterUrl}
            onChange={(e) => setPosterUrl(e.target.value)}
            placeholder="https://..."
            className="mt-2 w-full rounded border border-marquee-line bg-transparent px-3 py-2 text-sm text-marquee-text placeholder:text-marquee-textDim focus-ring"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-marquee-textDim">Links to</label>
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value as "anime" | "movie")}
            disabled={!isNew}
            className="mt-2 w-full rounded border border-marquee-line bg-transparent px-3 py-2 text-sm text-marquee-text focus-ring disabled:opacity-50"
          >
            <option value="movie">Movie</option>
            <option value="anime">Anime</option>
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-marquee-textDim">
            {contentType === "movie" ? "Movie" : "Anime"} ID (from the catalog, e.g. its numeric id)
          </label>
          <input
            value={contentId}
            onChange={(e) => setContentId(e.target.value)}
            disabled={!isNew}
            placeholder="e.g. 603"
            className="mt-2 w-full rounded border border-marquee-line bg-transparent px-3 py-2 text-sm text-marquee-text placeholder:text-marquee-textDim focus-ring disabled:opacity-50"
          />
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-marquee-textDim">
            Cards (each is one swipeable screen — 2 to {MAX_CARDS})
          </p>
          <button
            onClick={addCard}
            disabled={cards.length >= MAX_CARDS}
            className="rounded border border-marquee-line px-3 py-1 text-xs text-marquee-text hover:border-marquee-gold disabled:opacity-40 focus-ring"
          >
            + Add card
          </button>
        </div>

        <div className="mt-3 space-y-4">
          {cards.map((card, i) => (
            <div key={i} className="ticket space-y-2 p-4">
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs text-marquee-gold">Card {i + 1}</p>
                {cards.length > 1 && (
                  <button onClick={() => removeCard(i)} className="text-xs text-red-300 hover:underline">
                    Remove
                  </button>
                )}
              </div>
              <input
                value={card.heading}
                onChange={(e) => updateCard(i, "heading", e.target.value)}
                placeholder="Heading, e.g. 'What it's about'"
                maxLength={80}
                className="w-full rounded border border-marquee-line bg-transparent px-3 py-2 text-sm text-marquee-text placeholder:text-marquee-textDim focus-ring"
              />
              <textarea
                value={card.text}
                onChange={(e) => updateCard(i, "text", e.target.value)}
                placeholder="Card body text"
                rows={3}
                maxLength={400}
                className="w-full rounded border border-marquee-line bg-transparent px-3 py-2 text-sm text-marquee-text placeholder:text-marquee-textDim focus-ring"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={status === "saving"}
          className="rounded bg-marquee-gold px-4 py-2 text-sm font-semibold text-marquee-bg disabled:opacity-50 focus-ring"
        >
          {status === "saving" ? "Saving..." : isNew ? "Create short" : "Save changes"}
        </button>
        {status === "saved" && <span className="text-sm text-marquee-gold">Saved.</span>}
        {status === "error" && <span className="text-sm text-red-400">{error ?? "Could not save."}</span>}
        {!isNew && (
          <button onClick={handleDelete} className="ml-auto rounded border border-marquee-line px-3 py-2 text-xs text-red-300 hover:border-red-400 focus-ring">
            Delete short
          </button>
        )}
      </div>
    </div>
  );
}
