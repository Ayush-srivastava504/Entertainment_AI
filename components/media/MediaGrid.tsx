import { MediaCard } from "@/components/media/MediaCard";
import type { MediaItem } from "@/lib/api/normalize";

export function MediaGrid({ items, basePath }: { items: MediaItem[]; basePath: string }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <MediaCard key={item.id} item={item} href={`${basePath}/${item.id}`} />
      ))}
    </div>
  );
}
