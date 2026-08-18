import { NextRequest, NextResponse } from "next/server";
import { getShorts } from "@/lib/api/shorts";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Math.min(30, Number(searchParams.get("limit") ?? "20"));

  try {
    const shorts = await getShorts(page, limit);
    return NextResponse.json({ shorts });
  } catch (err) {
    console.error("shorts feed error:", err);
    return NextResponse.json({ error: "Could not load shorts." }, { status: 502 });
  }
}
