import Link from "next/link";

const links = [
  { href: "/movies", label: "Movies" },
  { href: "/anime", label: "Anime" },
  { href: "/anime/best", label: "Rankings" },
  { href: "/stories", label: "Stories" },
  { href: "/tools/tag-generator", label: "Creator Tools" },
  { href: "/quiz", label: "Quizzes" },
  { href: "/blog", label: "Blog" },
  { href: "/favorites", label: "★ Favorites" },
];

export default function Nav() {
  return (
    <header className="border-b border-marquee-line bg-marquee-bg/95 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 focus-ring rounded">
          <span className="font-display text-2xl tracking-marquee text-marquee-gold">
            MARQUEE
          </span>
        </Link>
        <nav className="hidden md:flex items-center flex-wrap justify-end gap-x-6 gap-y-2 text-sm text-marquee-textDim">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hover:text-marquee-gold transition-colors focus-ring rounded"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
