import { NextResponse } from "next/server";
import { getAnimeSection } from "@/lib/api/jikan";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const section = (searchParams.get("section") as "trending" | "popular" | "top-rated" | "upcoming" | "search") ?? "trending";
  const query = searchParams.get("q") ?? "";
  const page = Number(searchParams.get("page") ?? "1");
  const items = await getAnimeSection(section, query, page);
  return NextResponse.json({ items });
}
