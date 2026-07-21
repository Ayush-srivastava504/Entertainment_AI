import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() || "";

  return NextResponse.json({
    query,
    results: {
      anime: [],
      movies: [],
      blog: [],
      quizzes: [],
    },
  });
}
