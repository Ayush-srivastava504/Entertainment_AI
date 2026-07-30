import { ImageResponse } from "next/og";
import { GENRES } from "@/lib/genres";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ genre: string }> }) {
  const { genre } = await params;
  const label = GENRES.find((g) => g.slug === genre)?.label ?? genre;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#12131A",
          backgroundImage:
            "radial-gradient(circle at 80% 25%, rgba(232,176,75,0.18) 0%, rgba(232,176,75,0) 45%)",
        }}
      >
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 6, color: "#E8B04B", fontFamily: "sans-serif" }}>
          🎯 MARQUEE · GENRE
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 92,
            fontWeight: 700,
            color: "#EDEBE3",
            fontFamily: "sans-serif",
            marginTop: 20,
          }}
        >
          {label}
        </div>
        <div style={{ display: "flex", fontSize: 32, color: "#9C9CAA", fontFamily: "sans-serif", marginTop: 16 }}>
          Anime &amp; movies, ranked
        </div>
      </div>
    ),
    { ...size }
  );
}
