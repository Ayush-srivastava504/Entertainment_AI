import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ genre: string }> }) {
  const { genre } = await params;
  return NextResponse.json({ genre, items: [] });
}
