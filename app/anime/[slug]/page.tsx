import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getAnimeBySlugOrId, getSimilarAnime } from "@/lib/api/anime";
import { buildOgImageUrl } from "@/lib/og";
import { SimilarTitles } from "@/components/media/SimilarTitles";

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.marquees.site").replace(/\/$/, "");

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getAnimeBySlugOrId(slug);
  if (!result) return {};
  const { anime } = result;

  const url = `${BASE_URL}/anime/${anime.slug}`;
  const title = anime.year ? `${anime.title} (${anime.year}) — Marquee` : `${anime.title} — Marquee`;
  const description = anime.description || `Details, rating, and genres for ${anime.title}.`;

  const ogImage = buildOgImageUrl({
    title: anime.title,
    subtitle: anime.year ? String(anime.year) : undefined,
    badge: "ANIME",
    poster: anime.posterUrl,
    rating: anime.score ? anime.score.toFixed(1) : undefined,
  });

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: anime.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: anime.title,
      description,
      url,
      type: "video.tv_show",
      images: [{ url: ogImage, width: 1200, height: 630, alt: anime.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: anime.title,
      description,
      images: [ogImage],
    },
  };
}

export default async function AnimeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getAnimeBySlugOrId(slug);
  if (!result) notFound();
  const { anime, isCanonical } = result;

  if (!isCanonical) {
    permanentRedirect(`/anime/${anime.slug}`);
  }

  const url = `${BASE_URL}/anime/${anime.slug}`;
  const similar = await getSimilarAnime(anime.id, anime.genres);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    name: anime.title,
    image: anime.posterUrl || undefined,
    description: anime.longDescription || anime.description || undefined,
    genre: anime.genres,
    ...(anime.castList && anime.castList.length > 0
      ? { actor: anime.castList.map((m) => ({ "@type": "Person", name: m.name })) }
      : {}),
    ...(anime.score && anime.ratingCount
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: anime.score,
            bestRating: 10,
            ratingCount: anime.ratingCount,
          },
        }
      : {}),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Anime", item: `${BASE_URL}/anime` },
      { "@type": "ListItem", position: 2, name: anime.title, item: url },
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
      <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="overflow-hidden rounded border border-marquee-line bg-marquee-panel">
          {anime.posterUrl ? <img src={anime.posterUrl} alt={anime.title} className="h-full w-full object-cover" /> : <div className="p-8 text-sm text-marquee-textDim">No poster</div>}
        </div>
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-marquee-gold">🍥 detail</p>
          <h1 className="mt-3 font-display text-3xl sm:text-5xl text-marquee-text">{anime.title}</h1>
          {anime.longDescription ? (
            anime.longDescription.split(/\n+/).filter(Boolean).map((para, i) => (
              <p key={i} className="mt-4 text-marquee-textDim">{para}</p>
            ))
          ) : (
            <p className="mt-4 text-marquee-textDim">{anime.description}</p>
          )}
          <div className="mt-6 flex flex-wrap gap-2 text-sm text-marquee-textDim">
            {anime.year ? <span className="rounded border border-marquee-line px-3 py-1">{anime.year}</span> : null}
            {anime.score ? <span className="rounded border border-marquee-line px-3 py-1">★ {anime.score.toFixed(1)}</span> : null}
            {anime.genres.map((genre) => <span key={genre} className="rounded border border-marquee-line px-3 py-1">{genre}</span>)}
          </div>
          {anime.tags && anime.tags.length > 0 && (
            <div className="mt-8">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-marquee-gold mb-3">Tags</p>
              <div className="flex flex-wrap gap-2">
                {anime.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/anime/search?q=${encodeURIComponent(tag)}`}
                    className="rounded-full border border-marquee-line px-3 py-1 text-xs text-marquee-textDim hover:border-marquee-gold hover:text-marquee-gold"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8">
            <Link href="/anime" className="rounded border border-marquee-line px-4 py-2 text-marquee-text">Back to anime hub</Link>
          </div>
        </div>
      </div>

      {anime.castList && anime.castList.length > 0 && (
        <div className="mt-14">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-marquee-gold mb-4">Cast</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {anime.castList.map((member) => (
              <div key={`${member.name}-${member.role}`} className="flex items-center gap-3 rounded border border-marquee-line bg-marquee-panel p-3">
                {member.photoUrl ? (
                  <img src={member.photoUrl} alt={member.name} className="h-12 w-12 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="h-12 w-12 shrink-0 rounded-full bg-marquee-line" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm text-marquee-text">{member.name}</p>
                  <p className="truncate text-xs text-marquee-textDim">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <SimilarTitles items={similar} basePath="/anime" />
    </div>
  );
}
