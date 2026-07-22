import { NextRequest, NextResponse } from "next/server";
import { createQueueJob, markQueueJobDone, markQueueJobFailed } from "@/lib/db";
import { buildPrompt, Task } from "@/lib/prompts";
import { generateWithAI, AiUnavailableError } from "@/lib/ai";

export const runtime = "nodejs";

const VALID_TASKS: Task[] = [
  "movie-recommend",
  "anime-find",
  "tag-generate",
  "story-generate",
  "thumbnail-feedback",
];

// Small in-memory rate limit per server instance. Fine for a starter;
// swap for Upstash/Redis if you need it to hold across serverless
// instances or behind multiple regions.
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

// A hard cap on any single input field so nobody can queue a multi-MB
// prompt (protects both Postgres and the HF Space request body size).
const MAX_FIELD_LENGTH = 2000;

function validateInput(input: unknown): input is Record<string, string> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (typeof key !== "string" || key.length > 100) return false;
    if (typeof value !== "string" || value.length > MAX_FIELD_LENGTH) return false;
  }
  return true;
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
  if (!validateInput(input)) {
    return NextResponse.json(
      { error: "Missing or invalid input object (each field must be a string, max 2000 chars)." },
      { status: 400 }
    );
  }

  const ip = req.headers.get("x-forwarded-for") ?? "local";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Wait a minute and try again." },
      { status: 429 }
    );
  }

  // We still keep a queue_jobs row (useful history/audit trail + the
  // existing polling UI keeps working), but it's resolved inline in this
  // same request now instead of waiting for a daily EC2 batch job.
  let jobId: string;
  try {
    const job = await createQueueJob(task as Task, input);
    jobId = job.id;
  } catch (err) {
    console.error("queue insert error:", err);
    return NextResponse.json(
      { error: "Could not queue this request. Try again shortly." },
      { status: 502 }
    );
  }

  try {
    const prompt = buildPrompt(task as Task, input);
    const result = await generateWithAI(prompt);
    await markQueueJobDone(jobId, result);
    return NextResponse.json({ id: jobId, status: "done", result });
  } catch (err) {
    const message =
      err instanceof AiUnavailableError
        ? err.message
        : "Generation failed. Try again shortly.";
    await markQueueJobFailed(jobId, message);
    return NextResponse.json({ id: jobId, status: "failed", error: message }, { status: 502 });
  }
}
