import Link from "next/link";

const tools = [
  {
    href: "/movies",
    emoji: "🎬",
    title: "Movie Recommender",
    desc: "Describe a mood, not a genre. Get 5 picks that actually fit.",
  },
  {
    href: "/anime",
    emoji: "🍥",
    title: "Anime Finder",
    desc: "\"White-haired MC who fights demons\" is a valid search here.",
  },
  {
    href: "/stories",
    emoji: "📖",
    title: "Story Generator",
    desc: "Pick a genre, a character, an ending. Get a story on the spot.",
  },
  {
    href: "/tools/tag-generator",
    emoji: "🏷",
    title: "Tag Generator",
    desc: "YouTube, Instagram, TikTok tags for your next upload, in seconds.",
  },
  {
    href: "/tools/thumbnail-rating",
    emoji: "🖼",
    title: "Thumbnail Rating",
    desc: "Upload a thumbnail, get a CTR score and concrete fixes.",
  },
  {
    href: "/quiz",
    emoji: "🧠",
    title: "Personality Quiz",
    desc: "Generate a shareable quiz question in one click.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-marquee-line">
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-16">
          <div className="bulb-row mb-6" aria-hidden="true">
            {Array.from({ length: 9 }).map((_, i) => (
              <span
                key={i}
                className="bulb"
                style={{ animationDelay: `${i * 0.18}s` }}
              />
            ))}
          </div>
          <h1 className="font-display text-6xl sm:text-7xl leading-[0.95] text-marquee-text tracking-wide">
            NOW SHOWING:
            <br />
            <span className="text-marquee-gold">ENTERTAINMENT, RUN ON AI</span>
          </h1>
          <p className="mt-6 max-w-xl text-marquee-textDim text-lg">
            Discover movies and anime by mood, not metadata. Write stories,
            generate tags, and rate thumbnails — one model, tuned for every
            tool on this marquee.
          </p>
          <div className="mt-8 flex gap-4">
            <Link
              href="/movies"
              className="rounded bg-marquee-gold px-6 py-3 font-semibold text-marquee-bg hover:bg-marquee-amber transition focus-ring"
            >
              Find something to watch
            </Link>
            <Link
              href="/tools/tag-generator"
              className="rounded border border-marquee-line px-6 py-3 font-semibold text-marquee-text hover:border-marquee-gold transition focus-ring"
            >
              Creator tools
            </Link>
          </div>
          <p className="mt-6 text-sm text-marquee-textDim">
            Or browse{" "}
            <Link href="/anime/best" className="underline hover:text-marquee-gold">
              anime rankings
            </Link>
            ,{" "}
            <Link href="/movies/best" className="underline hover:text-marquee-gold">
              movie rankings
            </Link>
            , and the{" "}
            <Link href="/blog" className="underline hover:text-marquee-gold">
              blog
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tools.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="ticket p-6 pl-8 flex flex-col gap-2 hover:border-marquee-gold transition-colors focus-ring"
            >
              <span className="text-2xl">{t.emoji}</span>
              <h2 className="font-display text-2xl tracking-wide text-marquee-text">
                {t.title}
              </h2>
              <p className="text-sm text-marquee-textDim">{t.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
