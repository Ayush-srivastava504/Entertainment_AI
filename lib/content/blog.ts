export interface BlogPost {
  slug: string;
  title: string;
  metaDescription: string;
  date: string; // ISO
  body: string[]; // paragraphs
}

/**
 * Draft these with the model, then edit and commit like any other content —
 * same idea as the rankings file. Keeping blog content in the repo (versus
 * generating it live) is what makes it indexable and fast.
 */
export const blogPosts: BlogPost[] = [
  {
    slug: "one-piece-watch-order",
    title: "One Piece Watch Order: The Fastest Way In",
    metaDescription:
      "How to approach One Piece's 1000+ episodes without burning out in the first arc.",
    date: "2026-06-02",
    body: [
      "One Piece's episode count scares more people off than its actual pacing deserves. The manga moves briskly; the anime, especially in its first hundred-odd episodes, does not.",
      "The most common recommendation for new viewers is to watch straight through but treat the East Blue arc (episodes 1-61) as a lower bar than the rest of the series — the show visibly finds its footing once the Grand Line starts.",
      "If a full chronological watch still feels daunting, the manga covers the same ground in a fraction of the time and is a reasonable way to catch up before jumping into the anime at a more current arc.",
      "Whichever route you take, the Alabasta arc is generally where the series clicks for people who were on the fence — if you're not in by the end of it, the show's format may not be for you, and that's a fine place to stop.",
    ],
  },
  {
    slug: "marvel-timeline-explained",
    title: "The MCU Timeline, In the Order Things Actually Happened",
    metaDescription:
      "Watching the Marvel Cinematic Universe in in-universe chronological order versus release order.",
    date: "2026-05-14",
    body: [
      "Release order and in-universe chronological order diverge early and often in the MCU, and both have a real case for them.",
      "Release order preserves the intended reveals and matches how the broader cultural conversation unfolded — useful if you want context for why certain moments became memes or discourse.",
      "Chronological order smooths out some tonal whiplash (a war film next to a heist comedy) but spoils character arcs that were meant to be discovered in a different sequence.",
      "The practical middle ground most people land on: watch in release order for the main Infinity Saga films, and treat the prequels (set earlier but released later) as optional context you can slot in afterward.",
    ],
  },
];

export function getBlogPost(slug: string) {
  return blogPosts.find((p) => p.slug === slug);
}
