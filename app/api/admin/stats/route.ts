import { NextResponse } from "next/server";
import { getAdminStats } from "@/lib/admin-db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const stats = await getAdminStats();
    return NextResponse.json({ stats });
  } catch (err) {
    console.error("admin stats error:", err);
    return NextResponse.json({ error: "Could not load stats." }, { status: 502 });
  }
}
