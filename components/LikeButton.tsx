"use client";

import { useEffect, useState } from "react";

interface LikeButtonProps {
  type: "blog" | "quiz";
  slug: string;
  initialLikes: number;
}

// Not real vote integrity (there's no login) -- just a localStorage flag
// so the same browser can't spam the button. Good enough for a hobby
// site's trending sort, which is a rough signal, not a leaderboard.
function storageKey(type: string, slug: string) {
  return `liked:${type}:${slug}`;
}

export default function LikeButton({ type, slug, initialLikes }: LikeButtonProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setLiked(localStorage.getItem(storageKey(type, slug)) === "1");
  }, [type, slug]);

  async function handleLike() {
    if (liked || pending) return;
    setPending(true);
    setLiked(true);
    setLikes((n) => n + 1);
    localStorage.setItem(storageKey(type, slug), "1");

    try {
      const res = await fetch("/api/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, slug }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.likes === "number") setLikes(data.likes);
      }
    } catch {
      // Keep the optimistic UI even if the network call fails -- worst
      // case the count is off by one until next page load.
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={handleLike}
      disabled={liked || pending}
      aria-pressed={liked}
      className={`text-xs font-mono rounded border px-2 py-1 transition focus-ring ${
        liked
          ? "border-marquee-gold text-marquee-gold"
          : "border-marquee-line text-marquee-textDim hover:border-marquee-gold hover:text-marquee-gold disabled:opacity-50"
      }`}
    >
      {liked ? "♥ liked" : "♡ like"} · {likes}
    </button>
  );
}
