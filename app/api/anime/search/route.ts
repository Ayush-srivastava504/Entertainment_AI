import { NextResponse } from "next/server";
import { getAnimeSection } from "@/lib/api/anime";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "12");

  if (!q) {
    return NextResponse.json({ q, items: [] });
  }

  const items = await getAnimeSection("search", q, page, limit);
  return NextResponse.json({ q, items });
}
