import TitleListTable from "@/components/admin/TitleListTable";

export default function AdminMoviesListPage() {
  return (
    <div>
      <h1 className="font-display text-3xl text-marquee-text">Movies</h1>
      <p className="mt-2 text-sm text-marquee-textDim">
        Flip noindex on thin/duplicate pages, feature your best titles, or write a real synopsis.
      </p>
      <div className="mt-6">
        <TitleListTable kind="movie" />
      </div>
    </div>
  );
}
