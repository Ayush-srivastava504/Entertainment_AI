import { MediaCard } from "@/components/media/MediaCard";
import type { MediaItem } from "@/lib/api/normalize";

export function SimilarTitles({ items, basePath, title = "You might also like" }: { items: MediaItem[]; basePath: string; title?: string }) {
  if (!items.length) return null;

  return (
    <section className="mt-16">
      <h2 className="font-display text-2xl text-marquee-text">{title}</h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <MediaCard key={item.id} item={item} href={`${basePath}/${item.slug}`} />
        ))}
      </div>
    </section>
  );
}
