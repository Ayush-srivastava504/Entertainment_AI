"use client";

import { useEffect, useState } from "react";
import { isFavorite, toggleFavorite } from "@/lib/favorites";

interface FavoriteButtonProps {
  id: string;
  type: "anime" | "movie";
  title: string;
}

export default function FavoriteButton({ id, type, title }: FavoriteButtonProps) {
  const [saved, setSaved] = useState(false);

  // Read from localStorage only after mount to avoid server/client mismatch.
  useEffect(() => {
    setSaved(isFavorite(id));
  }, [id]);

  return (
    <button
      onClick={() => setSaved(toggleFavorite({ id, type, title }))}
      aria-pressed={saved}
      className={`text-xs font-mono rounded border px-2 py-1 transition focus-ring ${
        saved
          ? "border-marquee-gold text-marquee-gold"
          : "border-marquee-line text-marquee-textDim hover:border-marquee-gold hover:text-marquee-gold"
      }`}
    >
      {saved ? "★ saved" : "☆ save"}
    </button>
  );
}
