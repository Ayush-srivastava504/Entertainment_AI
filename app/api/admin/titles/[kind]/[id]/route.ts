import { NextRequest, NextResponse } from "next/server";
import { getAdminTitle, updateAdminTitle, type TitleKind } from "@/lib/admin-db";

export const runtime = "nodejs";

function isKind(k: string): k is TitleKind {
  return k === "anime" || k === "movie";
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  if (!isKind(kind)) {
    return NextResponse.json({ error: "kind must be 'anime' or 'movie'." }, { status: 400 });
  }
  try {
    const title = await getAdminTitle(kind, id);
    if (!title) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ title });
  } catch (err) {
    console.error("admin title fetch error:", err);
    return NextResponse.json({ error: "Could not load title." }, { status: 502 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  if (!isKind(kind)) {
    return NextResponse.json({ error: "kind must be 'anime' or 'movie'." }, { status: 400 });
  }

  let body: { noindex?: boolean; featured?: boolean; synopsisOverride?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    await updateAdminTitle(kind, id, {
      noindex: body.noindex,
      featured: body.featured,
      synopsisOverride: body.synopsisOverride !== undefined ? (body.synopsisOverride?.trim().slice(0, 2000) || null) : undefined,
    });
    const title = await getAdminTitle(kind, id);
    return NextResponse.json({ title });
  } catch (err) {
    console.error("admin title update error:", err);
    return NextResponse.json({ error: "Could not save changes." }, { status: 502 });
  }
}
