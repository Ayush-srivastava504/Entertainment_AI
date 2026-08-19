import type { Metadata } from "next";
import { getShorts } from "@/lib/api/shorts";
import ShortsFeed from "@/components/ShortsFeed";

// Shorts change often (crawler + admin edits) and this is a low-traffic
// discovery surface, not an SEO landing page in its own right — force
// dynamic rendering so a new short never waits on a stale static build.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stories — Marquee",
  description: "Swipe through quick-hit story cards for anime and movies from the catalog.",
};

export default async function StoriesPage() {
  const shorts = await getShorts(1, 20);
  return <ShortsFeed initialShorts={shorts} />;
}
