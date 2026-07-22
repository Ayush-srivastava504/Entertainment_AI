import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // Lengths differ → definitely not equal, and comparing mismatched
  // buffer lengths would throw. Still constant-time relative to the
  // configured secret's length, which is what matters here.
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const secret = body.secret;
  const expected = process.env.REVALIDATION_SECRET;

  if (
    !expected ||
    typeof secret !== "string" ||
    !safeEqual(secret, expected)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ revalidated: true, now: new Date().toISOString() });
}
