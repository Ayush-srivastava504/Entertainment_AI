import Link from "next/link";
import { notFound } from "next/navigation";

const allowedCategories = ["anime", "movies", "culture", "behind-the-scenes"];

export const metadata = {
  title: "Blog Category — Marquee",
  description: "Browse blog posts by category.",
};

export default async function BlogCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!allowedCategories.includes(category)) notFound();

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <p className="font-mono text-xs tracking-[0.3em] text-marquee-gold">📝 CATEGORY</p>
      <h1 className="mt-3 font-display text-5xl text-marquee-text">{category}</h1>
      <p className="mt-4 text-marquee-textDim">Category views are ready for the next content integration step.</p>
      <div className="mt-8">
        <Link href="/blog" className="rounded border border-marquee-line px-4 py-2 text-marquee-text">Back to blog</Link>
      </div>
    </div>
  );
}
