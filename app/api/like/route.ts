import { NextRequest, NextResponse } from "next/server";
import { incrementLikes } from "@/lib/db";

export const runtime = "nodejs";

// Same lightweight per-instance rate limit pattern as /api/queue and
// /api/comments — good enough for a hobby site, swap for Upstash/Redis
// if this ever needs to hold across serverless instances.
const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > MAX_PER_WINDOW;
}

export async function POST(req: NextRequest) {
  let body: { type?: string; slug?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { type, slug } = body;
  if (type !== "blog" && type !== "quiz") {
    return NextResponse.json(
      { error: "type must be 'blog' or 'quiz'." },
      { status: 400 }
    );
  }
  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ error: "Missing slug." }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Wait a minute and try again." },
      { status: 429 }
    );
  }

  try {
    const likes = await incrementLikes(type, slug);
    if (likes === null) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ likes });
  } catch (err) {
    console.error("like insert error:", err);
    return NextResponse.json(
      { error: "Could not register that like. Try again shortly." },
      { status: 502 }
    );
  }
}
