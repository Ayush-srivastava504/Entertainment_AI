/*
Generates a branded 1200x630 Open Graph / Twitter card image on the fly for
any page on the site — movie/anime detail pages, rankings, quizzes, genre
pages, blog posts, and the homepage fallback. No static image assets or
design tool needed: the whole card is composed here with next/og's
ImageResponse (built into Next.js) and Marquee's existing brand colors.

Usage: /api/og?title=...&subtitle=...&badge=...&poster=...&rating=...
See lib/og.ts for the helper that builds this query string consistently.
*/

import { ImageResponse } from "next/og";

export const runtime = "edge";

const COLORS = {
  bg: "#12131A",
  panel: "#1A1C26",
  line: "#2C2F3D",
  gold: "#E8B04B",
  amber: "#D96C3F",
  text: "#EDEBE3",
  textDim: "#9C9CAA",
};

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const title = truncate(searchParams.get("title") || "Marquee", 90);
  const subtitle = searchParams.get("subtitle") ? truncate(searchParams.get("subtitle")!, 130) : null;
  const badge = searchParams.get("badge") || "MARQUEE";
  const poster = searchParams.get("poster");
  const rating = searchParams.get("rating");

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: COLORS.bg,
          backgroundImage: `radial-gradient(circle at 85% 0%, rgba(232,176,75,0.20) 0%, rgba(232,176,75,0) 55%)`,
          padding: "64px",
          position: "relative",
        }}
      >
        {/* thin gold rule along the top, evokes a marquee ticket edge */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, display: "flex", backgroundColor: COLORS.gold }} />

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              display: "flex",
              fontSize: 20,
              letterSpacing: 6,
              color: COLORS.gold,
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            {badge}
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 56 }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                fontSize: title.length > 40 ? 60 : 76,
                lineHeight: 1.08,
                color: COLORS.text,
                fontWeight: 700,
                letterSpacing: -1,
              }}
            >
              {title}
            </div>
            {subtitle && (
              <div
                style={{
                  display: "flex",
                  marginTop: 24,
                  fontSize: 30,
                  lineHeight: 1.4,
                  color: COLORS.textDim,
                  fontWeight: 400,
                }}
              >
                {subtitle}
              </div>
            )}
            {rating && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginTop: 28,
                  fontSize: 28,
                  color: COLORS.amber,
                  fontWeight: 700,
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill={COLORS.amber}>
                  <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.8-6.2 3.8 1.6-7-5.4-4.7 7.1-.6z" />
                </svg>
                {rating}
              </div>
            )}
          </div>

          {poster && (
            <div
              style={{
                display: "flex",
                width: 300,
                height: 450,
                borderRadius: 12,
                overflow: "hidden",
                border: `2px solid ${COLORS.line}`,
                boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
                flexShrink: 0,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={poster} width={300} height={450} style={{ objectFit: "cover" }} />
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 24,
              letterSpacing: 4,
              color: COLORS.text,
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            <div style={{ display: "flex", width: 12, height: 12, borderRadius: 999, backgroundColor: COLORS.gold }} />
            Marquee
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
