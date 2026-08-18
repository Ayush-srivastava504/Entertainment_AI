"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import type { ShortItem } from "@/lib/api/shorts";

function ShortCardStack({ item, active }: { item: ShortItem; active: boolean }) {
  const [cardIndex, setCardIndex] = useState(0);

  // Reset to the first card whenever this short scrolls back into view.
  useEffect(() => {
    if (active) setCardIndex(0);
  }, [active]);

  const detailHref = `/${item.contentType === "anime" ? "anime" : "movies"}/${item.contentId}`;
  const card = item.cards[cardIndex] ?? item.cards[0];

  function next() {
    setCardIndex((i) => Math.min(item.cards.length - 1, i + 1));
  }
  function prev() {
    setCardIndex((i) => Math.max(0, i - 1));
  }

  return (
    <div
      className="relative flex h-[calc(100vh-4rem)] w-full snap-start snap-always items-center justify-center overflow-hidden"
      style={{
        backgroundImage: item.posterUrl ? `url(${item.posterUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/85" />

      {/* Progress segments */}
      <div className="absolute left-4 right-4 top-4 z-20 flex gap-1.5">
        {item.cards.map((_, i) => (
          <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full bg-marquee-gold transition-all"
              style={{ width: i < cardIndex ? "100%" : i === cardIndex ? "100%" : "0%" }}
            />
          </div>
        ))}
      </div>

      {/* Tap zones for prev/next card within this short */}
      <button
        aria-label="Previous card"
        onClick={prev}
        className="absolute inset-y-0 left-0 z-10 w-1/3 focus:outline-none"
      />
      <button
        aria-label="Next card"
        onClick={next}
        className="absolute inset-y-0 right-0 z-10 w-1/3 focus:outline-none"
      />

      <div className="relative z-20 mx-auto max-w-md px-8 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-marquee-gold">{item.title}</p>
        <h2 className="mt-4 font-display text-3xl text-white sm:text-4xl">{card?.heading}</h2>
        <p className="mt-4 text-base leading-relaxed text-white/85">{card?.text}</p>

        <Link
          href={detailHref}
          onClick={() => trackEvent("select_content", { content_type: item.contentType, slug: item.slug })}
          className="mt-8 inline-block rounded border border-white/40 px-5 py-2 text-sm text-white hover:border-marquee-gold hover:text-marquee-gold focus-ring"
        >
          Open full page →
        </Link>
      </div>

      <p className="absolute bottom-6 z-20 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
        {cardIndex + 1} / {item.cards.length} · swipe up for next title
      </p>
    </div>
  );
}

export default function ShortsFeed({ initialShorts }: { initialShorts: ShortItem[] }) {
  const [shorts, setShorts] = useState(initialShorts);
  const [activeId, setActiveId] = useState<string | null>(initialShorts[0]?.id ?? null);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Track which short is centered in the viewport, and load more when the
  // sentinel near the end scrolls into view.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const itemObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            setActiveId(entry.target.getAttribute("data-short-id"));
          }
        }
      },
      { root: container, threshold: [0.6] }
    );
    container.querySelectorAll("[data-short-id]").forEach((el) => itemObserver.observe(el));

    let sentinelObserver: IntersectionObserver | null = null;
    if (sentinelRef.current) {
      sentinelObserver = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) loadMore();
        },
        { root: container, threshold: 0.1 }
      );
      sentinelObserver.observe(sentinelRef.current);
    }

    return () => {
      itemObserver.disconnect();
      sentinelObserver?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shorts.length]);

  async function loadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/shorts?page=${nextPage}`);
      const data = await res.json();
      if (data.shorts?.length) {
        setShorts((prev) => [...prev, ...data.shorts]);
        setPage(nextPage);
      }
    } catch {
      // silent — the feed just stops growing, which is fine
    } finally {
      setLoadingMore(false);
    }
  }

  if (!shorts.length) {
    return (
      <div className="flex h-[60vh] items-center justify-center px-6 text-center text-marquee-textDim">
        No stories yet — run <code className="text-marquee-gold">npm run crawl:shorts</code> to generate some.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-[calc(100vh-4rem)] w-full snap-y snap-mandatory overflow-y-scroll"
    >
      {shorts.map((item) => (
        <div key={item.id} data-short-id={item.id}>
          <ShortCardStack item={item} active={activeId === item.id} />
        </div>
      ))}
      <div ref={sentinelRef} className="h-1" />
    </div>
  );
}
