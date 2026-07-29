import { NextResponse } from "next/server";
import { getAnimeByGenre } from "@/lib/api/anime";

export async function GET(request: Request, { params }: { params: Promise<{ genre: string }> }) {
  const { genre } = await params;
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "12");
  const items = await getAnimeByGenre(genre, page, limit);
  return NextResponse.json({ genre, items });
}
