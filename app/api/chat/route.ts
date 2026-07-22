import { NextRequest, NextResponse } from "next/server";
import { addChatMessage, getRecentChatMessages } from "@/lib/db";

export const runtime = "nodejs";

// Same shared-IP rate limiter pattern as app/api/comments/route.ts. Chat
// is higher-frequency by nature than comments, so the window is stricter
// per-message but allows more messages overall.
const hits = new Map<string, number[]>();
const WINDOW_MS = 30_000;
const MAX_PER_WINDOW = 10;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > MAX_PER_WINDOW;
}

export async function GET() {
  try {
    const messages = await getRecentChatMessages();
    return NextResponse.json({ messages });
  } catch (err) {
    console.error("chat fetch error:", err);
    return NextResponse.json({ error: "Could not load chat." }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  let body: { name?: string; body?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const trimmedName = (body.name ?? "").trim().slice(0, 30) || "Anonymous";
  const trimmedBody = (body.body ?? "").trim().slice(0, 300);

  if (!trimmedBody) {
    return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "You're sending messages too fast. Slow down a bit." },
      { status: 429 }
    );
  }

  try {
    const message = await addChatMessage(trimmedName, trimmedBody);
    return NextResponse.json({ message });
  } catch (err) {
    console.error("chat insert error:", err);
    return NextResponse.json(
      { error: "Could not send that message. Try again shortly." },
      { status: 502 }
    );
  }
}
