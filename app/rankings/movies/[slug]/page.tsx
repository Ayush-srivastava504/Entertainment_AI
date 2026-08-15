import Link from "next/link";
import { notFound } from "next/navigation";
import { getRankingBySlug, getRankings } from "@/lib/db";
import { buildOgImageUrl } from "@/lib/og";

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.marquees.site").replace(/\/$/, "");

export const revalidate = 3600;

export async function generateStaticParams() {
  const rankings = await getRankings("movie", 100);
  return rankings.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ranking = await getRankingBySlug("movie", slug);
  if (!ranking) return {};

  const url = `${BASE_URL}/rankings/movies/${slug}`;
  const title = `${ranking.title} — Marquee`;
  const ogImage = buildOgImageUrl({ title: ranking.title, badge: "RANKING" });

  return {
    title,
    description: ranking.meta_description,
    alternates: { canonical: url },
    openGraph: {
      title: ranking.title,
      description: ranking.meta_description,
      url,
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: ranking.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: ranking.title,
      description: ranking.meta_description,
      images: [ogImage],
    },
  };
}

export default async function MovieMoodListPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ranking = await getRankingBySlug("movie", slug);
  if (!ranking) notFound();

  const url = `${BASE_URL}/rankings/movies/${slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: ranking.title,
    description: ranking.meta_description,
    url,
    numberOfItems: ranking.items.length,
    itemListElement: ranking.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.year ? `${item.title} (${item.year})` : item.title,
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Rankings", item: `${BASE_URL}/rankings` },
      { "@type": "ListItem", position: 2, name: "Movie rankings", item: `${BASE_URL}/rankings/movies` },
      { "@type": "ListItem", position: 3, name: ranking.title, item: url },
    ],
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd).replace(/</g, "\\u003c") }}
      />

      <nav className="text-xs text-marquee-textDim" aria-label="Breadcrumb">
        <Link href="/rankings" className="hover:text-marquee-gold">Rankings</Link>
        {" / "}
        <Link href="/rankings/movies" className="hover:text-marquee-gold">Movies</Link>
        {" / "}
        <span>{ranking.title}</span>
      </nav>

      <p className="mt-4 font-mono text-xs tracking-[0.3em] text-marquee-gold">🎬 MOOD LIST</p>
      <h1 className="mt-3 font-display text-3xl sm:text-5xl text-marquee-text">{ranking.title}</h1>
      <p className="mt-4 max-w-2xl text-marquee-textDim">{ranking.intro}</p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {ranking.items.map((item, index) => (
          <Link
            key={`${item.title}-${index}`}
            href={`/movies/search?q=${encodeURIComponent(item.title)}`}
            className="ticket p-5 hover:border-marquee-gold transition-colors"
          >
            <p className="font-mono text-xs text-marquee-gold">#{index + 1}</p>
            <h2 className="mt-2 font-display text-xl text-marquee-text">
              {item.title}
              {item.year ? <span className="text-marquee-textDim"> ({item.year})</span> : null}
            </h2>
            {item.blurb ? <p className="mt-2 text-sm text-marquee-textDim">{item.blurb}</p> : null}
          </Link>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-4">
        <Link href="/rankings/movies" className="rounded border border-marquee-line px-4 py-2 text-marquee-text hover:border-marquee-gold">
          More movie rankings
        </Link>
        <Link href="/movies" className="rounded border border-marquee-line px-4 py-2 text-marquee-text hover:border-marquee-gold">
          Movies hub
        </Link>
      </div>
    </div>
  );
}
