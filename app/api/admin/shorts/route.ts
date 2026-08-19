import { NextRequest, NextResponse } from "next/server";
import { listAdminShorts, createAdminShort, type AdminShortInput } from "@/lib/admin-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") ?? undefined;
  const page = Number(searchParams.get("page") ?? "1");

  try {
    const result = await listAdminShorts({ query, page });
    return NextResponse.json(result);
  } catch (err) {
    console.error("admin shorts list error:", err);
    return NextResponse.json({ error: "Could not load shorts." }, { status: 502 });
  }
}

function isValidInput(body: any): body is AdminShortInput {
  return (
    typeof body?.title === "string" &&
    body.title.trim().length > 0 &&
    (body?.contentType === "anime" || body?.contentType === "movie") &&
    typeof body?.contentId === "string" &&
    body.contentId.trim().length > 0 &&
    Array.isArray(body?.cards) &&
    body.cards.every((c: any) => typeof c?.heading === "string" && typeof c?.text === "string")
  );
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isValidInput(body)) {
    return NextResponse.json(
      { error: "title, contentType ('anime'|'movie'), contentId, and cards[] (heading/text) are required." },
      { status: 400 }
    );
  }

  try {
    const short = await createAdminShort({
      title: body.title.trim(),
      contentType: body.contentType,
      contentId: body.contentId.trim(),
      posterUrl: body.posterUrl || null,
      cards: body.cards.map((c: any) => ({ heading: String(c.heading).slice(0, 80), text: String(c.text).slice(0, 400) })),
    });
    return NextResponse.json({ short }, { status: 201 });
  } catch (err) {
    console.error("admin short create error:", err);
    return NextResponse.json({ error: "Could not create short." }, { status: 502 });
  }
}
