"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

const links = [
  { href: "/movies", label: "Movies" },
  { href: "/anime", label: "Anime" },
  { href: "/rankings", label: "Rankings" },
  { href: "/search", label: "Search" },
  { href: "/quizzes", label: "Quizzes" },
  { href: "/blog", label: "Blog" },
  { href: "/favorites", label: "★ Favorites" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="border-b border-marquee-line bg-marquee-bg/95 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-3 focus-ring rounded"
          onClick={() => setOpen(false)}
        >
          <span className="font-display text-2xl tracking-marquee text-marquee-gold">
            MARQUEE
          </span>
        </Link>

        {/* Desktop nav */}
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

        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          className="md:hidden flex h-9 w-9 items-center justify-center rounded border border-marquee-line text-marquee-text focus-ring"
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
          >
            {open ? (
              <path
                d="M2 2L16 16M16 2L2 16"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M2 4.5H16M2 9H16M2 13.5H16"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile nav drawer */}
      {open && (
        <nav
          id="mobile-nav"
          className="md:hidden border-t border-marquee-line px-4 py-3 flex flex-col gap-1 text-sm bg-marquee-bg"
        >
          {links.map((l) => {
            const active = pathname === l.href || pathname?.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`rounded px-2 py-2.5 transition-colors focus-ring ${
                  active
                    ? "text-marquee-gold"
                    : "text-marquee-textDim hover:text-marquee-gold"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
