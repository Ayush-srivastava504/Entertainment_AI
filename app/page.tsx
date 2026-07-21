import Link from "next/link";

const tools = [
  {
    href: "/movies",
    emoji: "🎬",
    title: "Movies Hub",
    desc: "Browse the latest, trending, and top-rated films in one place.",
  },
  {
    href: "/anime",
    emoji: "🍥",
    title: "Anime Hub",
    desc: "Explore anime collections with dedicated browse and search routes.",
  },
  {
    href: "/rankings",
    emoji: "⭐",
    title: "Rankings",
    desc: "Jump into curated anime and movie ranking collections.",
  },
  {
    href: "/search",
    emoji: "🔎",
    title: "Search",
    desc: "Use the unified search surface to find content across the marquee.",
  },
  {
    href: "/blog",
    emoji: "📝",
    title: "Blog",
    desc: "Read fresh editorial pieces generated for the daily marquee feed.",
  },
  {
    href: "/quizzes",
    emoji: "🧠",
    title: "Quizzes",
    desc: "Try shareable trivia and personality quizzes built into the experience.",
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
            Discover movies and anime through a curated marquee experience with
            rankings, search, blog posts, and quizzes all in one place.
          </p>
          <div className="mt-8 flex gap-4">
            <Link
              href="/movies"
              className="rounded bg-marquee-gold px-6 py-3 font-semibold text-marquee-bg hover:bg-marquee-amber transition focus-ring"
            >
              Find something to watch
            </Link>
            <Link
              href="/rankings"
              className="rounded border border-marquee-line px-6 py-3 font-semibold text-marquee-text hover:border-marquee-gold transition focus-ring"
            >
              Browse rankings
            </Link>
          </div>
          <p className="mt-6 text-sm text-marquee-textDim">
            Or browse{" "}
            <Link href="/rankings/anime" className="underline hover:text-marquee-gold">
              anime rankings
            </Link>
            ,{" "}
            <Link href="/rankings/movies" className="underline hover:text-marquee-gold">
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
