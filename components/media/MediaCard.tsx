import Link from "next/link";
import type { MediaItem } from "@/lib/api/normalize";

export function MediaCard({ item, href }: { item: MediaItem; href: string }) {
  return (
    <Link href={href} className="group block overflow-hidden rounded border border-marquee-line bg-marquee-panel transition hover:border-marquee-gold">
      <div className="aspect-[2/3] overflow-hidden bg-marquee-panel">
        {item.posterUrl ? (
          <img src={item.posterUrl} alt={item.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-marquee-textDim">No poster</div>
        )}
      </div>
      <div className="p-4">
        <p className="text-[11px] uppercase tracking-[0.25em] text-marquee-gold">{item.kind === "anime" ? "anime" : "movie"}</p>
        <h3 className="mt-2 font-display text-2xl text-marquee-text">{item.title}</h3>
        <p className="mt-2 text-sm text-marquee-textDim line-clamp-3">{item.description}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-marquee-textDim">
          {item.year ? <span>{item.year}</span> : null}
          {item.score ? <span>★ {item.score.toFixed(1)}</span> : null}
          {item.genres.slice(0, 2).map((genre) => <span key={genre}>{genre}</span>)}
        </div>
      </div>
    </Link>
  );
}
