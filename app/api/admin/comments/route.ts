import { NextRequest, NextResponse } from "next/server";
import { listAdminComments } from "@/lib/admin-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? "1");
  try {
    const result = await listAdminComments(page);
    return NextResponse.json(result);
  } catch (err) {
    console.error("admin comments list error:", err);
    return NextResponse.json({ error: "Could not load comments." }, { status: 502 });
  }
}
