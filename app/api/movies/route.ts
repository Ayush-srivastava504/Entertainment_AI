import { NextResponse } from "next/server";
import { getMovieSection, getMovieByGenre } from "@/lib/api/movies";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const section = (searchParams.get("section") as "trending" | "popular" | "top-rated" | "upcoming" | "latest" | "search") ?? "trending";
  const query = searchParams.get("q") ?? "";
  const genre = searchParams.get("genre") ?? "";
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "12");
  const items = genre ? await getMovieByGenre(genre, page, limit) : await getMovieSection(section, query, page, limit);
  return NextResponse.json({ items });
}
