import type { Metadata } from "next";
import { getShorts } from "@/lib/api/shorts";
import ShortsFeed from "@/components/ShortsFeed";

export const metadata: Metadata = {
  title: "Stories — Marquee",
  description: "Swipe through quick story cards on movies and anime — tap through, swipe up for the next title.",
};

export default async function StoriesPage() {
  const shorts = await getShorts(1, 20);

  return (
    <div className="bg-black">
      <ShortsFeed initialShorts={shorts} />
    </div>
  );
}
