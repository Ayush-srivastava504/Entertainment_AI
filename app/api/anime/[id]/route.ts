import { NextResponse } from "next/server";
import { getAnimeBySlugOrId } from "@/lib/api/anime";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getAnimeBySlugOrId(id);

  if (!result) {
    return NextResponse.json({ id, type: "anime", item: null }, { status: 404 });
  }

  return NextResponse.json({ id, type: "anime", item: result.anime });
}
