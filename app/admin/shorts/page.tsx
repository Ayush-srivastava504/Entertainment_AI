import ShortsListTable from "@/components/admin/ShortsListTable";

export default function AdminShortsListPage() {
  return (
    <div>
      <h1 className="font-display text-3xl text-marquee-text">Shorts</h1>
      <p className="mt-2 text-sm text-marquee-textDim">
        Vertical swipeable story cards shown on <code className="text-marquee-gold">/stories</code>. Create one by hand
        below, or run <code className="text-marquee-gold">npm run crawl:shorts</code> to generate them in bulk from the
        catalog.
      </p>
      <div className="mt-6">
        <ShortsListTable />
      </div>
    </div>
  );
}
