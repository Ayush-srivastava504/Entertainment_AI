import { NextResponse } from "next/server";
import { getMovieBySlugOrId } from "@/lib/api/movies";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getMovieBySlugOrId(id);

  if (!result) {
    return NextResponse.json({ id, type: "movie", item: null }, { status: 404 });
  }

  return NextResponse.json({ id, type: "movie", item: result.movie });
}
