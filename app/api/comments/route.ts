import { NextRequest, NextResponse } from "next/server";
import { addComment, getComments } from "@/lib/db";

export const runtime = "nodejs";

const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 6; // posting is stricter than liking

function rateLimited(key: string): boolean {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > MAX_PER_WINDOW;
}

function isValidType(t: unknown): t is "blog" | "quiz" {
  return t === "blog" || t === "quiz";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const slug = searchParams.get("slug");

  if (!isValidType(type) || !slug) {
    return NextResponse.json(
      { error: "type must be 'blog' or 'quiz', and slug is required." },
      { status: 400 }
    );
  }

  try {
    const comments = await getComments(type, slug);
    return NextResponse.json({ comments });
  } catch (err) {
    console.error("comments fetch error:", err);
    return NextResponse.json(
      { error: "Could not load comments." },
      { status: 502 }
    );
  }
}

export async function POST(req: NextRequest) {
  let body: { type?: string; slug?: string; name?: string; body?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { type, slug, name, body: commentBody } = body;

  if (!isValidType(type) || !slug) {
    return NextResponse.json(
      { error: "type must be 'blog' or 'quiz', and slug is required." },
      { status: 400 }
    );
  }

  const trimmedName = (name ?? "").trim().slice(0, 60);
  const trimmedBody = (commentBody ?? "").trim().slice(0, 1000);

  if (!trimmedName) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!trimmedBody) {
    return NextResponse.json({ error: "Comment can't be empty." }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many comments. Wait a minute and try again." },
      { status: 429 }
    );
  }

  try {
    const comment = await addComment(type, slug, trimmedName, trimmedBody);
    return NextResponse.json({ comment });
  } catch (err) {
    console.error("comment insert error:", err);
    return NextResponse.json(
      { error: "Could not post that comment. Try again shortly." },
      { status: 502 }
    );
  }
}
