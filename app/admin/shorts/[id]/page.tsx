import { notFound } from "next/navigation";
import { getAdminShort } from "@/lib/admin-db";
import ShortEditor from "@/components/admin/ShortEditor";

export const dynamic = "force-dynamic";

export default async function AdminEditShortPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const short = await getAdminShort(id);
  if (!short) notFound();

  return (
    <div>
      <h1 className="font-display text-3xl text-marquee-text">Edit short</h1>
      <div className="mt-6">
        <ShortEditor existing={short} />
      </div>
    </div>
  );
}
