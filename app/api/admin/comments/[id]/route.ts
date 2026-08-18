import { NextRequest, NextResponse } from "next/server";
import { deleteAdminComment } from "@/lib/admin-db";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await deleteAdminComment(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin comment delete error:", err);
    return NextResponse.json({ error: "Could not delete comment." }, { status: 502 });
  }
}
