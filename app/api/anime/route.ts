import { NextResponse } from "next/server";
import { getAnimeSection, getAnimeByGenre } from "@/lib/api/anime";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const section = (searchParams.get("section") as "trending" | "popular" | "top-rated" | "upcoming" | "airing" | "search") ?? "trending";
  const query = searchParams.get("q") ?? "";
  const genre = searchParams.get("genre") ?? "";
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "12");
  const items = genre ? await getAnimeByGenre(genre, page, limit) : await getAnimeSection(section, query, page, limit);
  return NextResponse.json({ items });
}
