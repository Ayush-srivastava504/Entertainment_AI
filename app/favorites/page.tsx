"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FavoriteItem, getFavorites, removeFavorite } from "@/lib/favorites";

export default function FavoritesPage() {
  const [items, setItems] = useState<FavoriteItem[] | null>(null);

  function refresh() {
    setItems(getFavorites());
  }

  useEffect(() => {
    refresh();
    window.addEventListener("marquee:favorites-changed", refresh);
    return () =>
      window.removeEventListener("marquee:favorites-changed", refresh);
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="font-mono text-xs text-marquee-gold tracking-marquee mb-2">
        ★ WATCHLIST
      </p>
      <h1 className="font-display text-3xl sm:text-5xl text-marquee-text mb-3">
        Your Favorites
      </h1>
      <p className="text-marquee-textDim mb-8">
        Saved on this device only — there&apos;s no account system yet, so
        this list lives in your browser&apos;s local storage.
      </p>

      {items === null && (
        <p className="text-marquee-textDim font-mono text-sm">Loading…</p>
      )}

      {items && items.length === 0 && (
        <div className="ticket p-6 pl-8">
          <p className="text-marquee-textDim">
            Nothing saved yet. Hit{" "}
            <span className="text-marquee-gold">☆ save</span> on any title in
            the{" "}
            <Link href="/anime/best" className="underline hover:text-marquee-gold">
              anime
            </Link>{" "}
            or{" "}
            <Link href="/movies/best" className="underline hover:text-marquee-gold">
              movie
            </Link>{" "}
            rankings.
          </p>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((f) => (
            <li
              key={f.id}
              className="ticket p-5 pl-8 flex items-center justify-between gap-4"
            >
              <div>
                <span className="font-mono text-xs text-marquee-textDim uppercase mr-2">
                  {f.type}
                </span>
                <span className="text-marquee-text">{f.title}</span>
              </div>
              <button
                onClick={() => removeFavorite(f.id)}
                className="text-xs font-mono text-marquee-textDim hover:text-marquee-amber transition focus-ring"
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
