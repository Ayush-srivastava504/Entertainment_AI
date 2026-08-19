import { NextRequest, NextResponse } from "next/server";
import { getAdminShort, updateAdminShort, deleteAdminShort } from "@/lib/admin-db";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const short = await getAdminShort(id);
    if (!short) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ short });
  } catch (err) {
    console.error("admin short fetch error:", err);
    return NextResponse.json({ error: "Could not load short." }, { status: 502 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.cards !== undefined) {
    if (
      !Array.isArray(body.cards) ||
      !body.cards.every((c: any) => typeof c?.heading === "string" && typeof c?.text === "string")
    ) {
      return NextResponse.json({ error: "cards must be an array of {heading, text}." }, { status: 400 });
    }
  }

  try {
    const short = await updateAdminShort(id, {
      title: typeof body.title === "string" ? body.title.trim() : undefined,
      posterUrl: body.posterUrl !== undefined ? body.posterUrl || null : undefined,
      cards: body.cards
        ? body.cards.map((c: any) => ({ heading: String(c.heading).slice(0, 80), text: String(c.text).slice(0, 400) }))
        : undefined,
    });
    if (!short) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ short });
  } catch (err) {
    console.error("admin short update error:", err);
    return NextResponse.json({ error: "Could not save changes." }, { status: 502 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await deleteAdminShort(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin short delete error:", err);
    return NextResponse.json({ error: "Could not delete short." }, { status: 502 });
  }
}
