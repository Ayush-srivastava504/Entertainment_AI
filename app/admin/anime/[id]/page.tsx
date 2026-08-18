import { notFound } from "next/navigation";
import { getAdminTitle } from "@/lib/admin-db";
import TitleEditForm from "@/components/admin/TitleEditForm";

export const dynamic = "force-dynamic";

export default async function AdminAnimeEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const title = await getAdminTitle("anime", id);
  if (!title) notFound();
  return <TitleEditForm kind="anime" title={title} />;
}
