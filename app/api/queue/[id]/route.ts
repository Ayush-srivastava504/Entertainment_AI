import { NextRequest, NextResponse } from "next/server";
import { getQueueJob } from "@/lib/db";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid job id." }, { status: 400 });
  }

  try {
    const job = await getQueueJob(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }
    return NextResponse.json({
      id: job.id,
      status: job.status,
      result: job.result,
      error: job.error,
      created_at: job.created_at,
      completed_at: job.completed_at,
    });
  } catch (err) {
    console.error("queue lookup error:", err);
    return NextResponse.json(
      { error: "Could not look up this job." },
      { status: 502 }
    );
  }
}
