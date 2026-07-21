import { NextResponse } from "next/server";
import { getRankings } from "@/lib/db";

export async function GET() {
  const rankings = await getRankings("anime", 10);
  return NextResponse.json(rankings);
}
