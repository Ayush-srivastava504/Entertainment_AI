import { NextResponse } from "next/server";
import { getBlogPosts } from "@/lib/db";

export async function GET() {
  const posts = await getBlogPosts(10);
  return NextResponse.json(posts);
}
