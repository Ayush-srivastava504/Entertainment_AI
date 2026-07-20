import { notFound } from "next/navigation";
import { animeRankings, getAnimeRanking } from "@/lib/content/rankings";
import FavoriteButton from "@/components/FavoriteButton";

export function generateStaticParams() {
  return animeRankings.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ranking = getAnimeRanking(slug);
  if (!ranking) return {};
  return { title: `${ranking.title} — Marquee`, description: ranking.metaDescription };
}

export default async function AnimeRankingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ranking = getAnimeRanking(slug);
  if (!ranking) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="font-mono text-xs text-marquee-gold tracking-marquee mb-2">
        ⭐ RANKINGS
      </p>
      <h1 className="font-display text-5xl text-marquee-text mb-4">
        {ranking.title}
      </h1>
      <p className="text-marquee-textDim mb-10">{ranking.intro}</p>

      <ol className="space-y-4">
        {ranking.items.map((item, i) => (
          <li key={item.title} className="ticket p-5 pl-8 flex gap-4">
            <span className="font-display text-3xl text-marquee-gold w-10 shrink-0">
              {i + 1}
            </span>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-2xl text-marquee-text">
                  {item.title}{" "}
                  <span className="text-marquee-textDim text-base font-body">
                    ({item.year})
                  </span>
                </h2>
                <FavoriteButton
                  id={`anime:${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  type="anime"
                  title={item.title}
                />
              </div>
              <p className="text-sm text-marquee-textDim mt-1">{item.blurb}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
