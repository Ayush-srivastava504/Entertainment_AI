import { ImageResponse } from "next/og";
import { getRankingBySlug } from "@/lib/db";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ranking = await getRankingBySlug("anime", slug);
  const title = ranking?.title ?? "Anime Rankings";
  const count = ranking?.items?.length ?? 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#12131A",
          backgroundImage:
            "radial-gradient(circle at 15% 20%, rgba(232,176,75,0.18) 0%, rgba(232,176,75,0) 45%)",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 6, color: "#E8B04B", fontFamily: "sans-serif" }}>
          🍥 MARQUEE · ANIME MOOD LIST
        </div>
        <div
          style={{
            display: "flex",
            fontSize: title.length > 34 ? 62 : 76,
            fontWeight: 700,
            color: "#EDEBE3",
            fontFamily: "sans-serif",
            lineHeight: 1.15,
            maxWidth: 980,
          }}
        >
          {title}
        </div>
        {count > 0 ? (
          <div style={{ display: "flex", fontSize: 32, color: "#9C9CAA", fontFamily: "sans-serif" }}>
            {count} titles, ranked by score
          </div>
        ) : (
          <div style={{ display: "flex", fontSize: 32, color: "#9C9CAA", fontFamily: "sans-serif" }}>
            marquees.site
          </div>
        )}
      </div>
    ),
    { ...size }
  );
}
