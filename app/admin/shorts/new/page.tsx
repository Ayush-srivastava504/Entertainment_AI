import ShortEditor from "@/components/admin/ShortEditor";

export default function AdminNewShortPage() {
  return (
    <div>
      <h1 className="font-display text-3xl text-marquee-text">New short</h1>
      <p className="mt-2 text-sm text-marquee-textDim">
        Find the content ID from the title's admin edit page URL (e.g. <code className="text-marquee-gold">/admin/movies/603</code> → id is <code className="text-marquee-gold">603</code>).
      </p>
      <div className="mt-6">
        <ShortEditor />
      </div>
    </div>
  );
}
