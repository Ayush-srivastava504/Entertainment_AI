import { NextResponse } from "next/server";
import { getMovieSection } from "@/lib/api/movies";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const section = (searchParams.get("section") as "trending" | "popular" | "top-rated" | "upcoming" | "latest" | "search") ?? "trending";
  const query = searchParams.get("q") ?? "";
  const page = Number(searchParams.get("page") ?? "1");
  const items = await getMovieSection(section, query, page);
  return NextResponse.json({ items });
}
