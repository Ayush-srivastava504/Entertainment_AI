import { NextRequest, NextResponse } from "next/server";
import { createQueueJob } from "@/lib/db";
import { Task } from "@/lib/prompts";

export const runtime = "nodejs";

const VALID_TASKS: Task[] = [
  "movie-recommend",
  "anime-find",
  "tag-generate",
  "story-generate",
  "quiz-generate",
  "thumbnail-feedback",
];

// Small in-memory rate limit per server instance — same as the old
// /api/generate route had. Fine for a starter; swap for Upstash/Redis if
// you need it to hold across serverless instances.
const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > MAX_PER_WINDOW;
}

export async function POST(req: NextRequest) {
  let body: { task?: string; input?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { task, input } = body;

  if (!task || !VALID_TASKS.includes(task as Task)) {
    return NextResponse.json(
      { error: `task must be one of: ${VALID_TASKS.join(", ")}` },
      { status: 400 }
    );
  }
  if (!input || typeof input !== "object") {
    return NextResponse.json({ error: "Missing input object." }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Wait a minute and try again." },
      { status: 429 }
    );
  }

  try {
    const job = await createQueueJob(task, input);
    return NextResponse.json({ id: job.id, status: job.status });
  } catch (err) {
    console.error("queue insert error:", err);
    return NextResponse.json(
      { error: "Could not queue this request. Try again shortly." },
      { status: 502 }
    );
  }
}
