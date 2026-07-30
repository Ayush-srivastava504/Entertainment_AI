import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
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
            "radial-gradient(circle at 20% 20%, rgba(232,176,75,0.16) 0%, rgba(232,176,75,0) 45%), radial-gradient(circle at 85% 75%, rgba(217,108,63,0.14) 0%, rgba(217,108,63,0) 45%)",
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: 8,
            color: "#E8B04B",
            fontFamily: "sans-serif",
            marginBottom: 20,
          }}
        >
          🎬 MARQUEE 🍥
        </div>
        <div
          style={{
            fontSize: 78,
            fontWeight: 700,
            color: "#EDEBE3",
            fontFamily: "sans-serif",
            letterSpacing: 2,
          }}
        >
          Discover anime &amp; movies
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 30,
            color: "#9C9CAA",
            fontFamily: "sans-serif",
          }}
        >
          Rankings · Moods · Quizzes · Blog
        </div>
      </div>
    ),
    { ...size }
  );
}
