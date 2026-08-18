import { NextRequest, NextResponse } from "next/server";
import { listAdminTitles, type TitleKind } from "@/lib/admin-db";

export const runtime = "nodejs";

function isKind(k: string): k is TitleKind {
  return k === "anime" || k === "movie";
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!isKind(kind)) {
    return NextResponse.json({ error: "kind must be 'anime' or 'movie'." }, { status: 400 });
  }
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") ?? undefined;
  const page = Number(searchParams.get("page") ?? "1");
  const filter = (searchParams.get("filter") ?? "all") as "all" | "thin" | "noindex" | "featured";

  try {
    const result = await listAdminTitles(kind, { query, page, filter });
    return NextResponse.json(result);
  } catch (err) {
    console.error("admin titles list error:", err);
    return NextResponse.json({ error: "Could not load titles." }, { status: 502 });
  }
}
