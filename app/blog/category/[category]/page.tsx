import Link from "next/link";
import { notFound } from "next/navigation";
import { getBlogPosts } from "@/lib/db";

const allowedCategories = ["movies", "tv", "anime", "celebrities", "gaming"];

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!allowedCategories.includes(category)) return {};
  return {
    title: `${category[0].toUpperCase()}${category.slice(1)} News — Marquee`,
    description: `Trending ${category} news, crawled and summarized.`,
  };
}

export default async function BlogCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!allowedCategories.includes(category)) notFound();

  const posts = await getBlogPosts(100, "trending", category);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="font-mono text-xs tracking-[0.3em] text-marquee-gold">📝 CATEGORY</p>
      <h1 className="mt-3 font-display text-3xl sm:text-5xl text-marquee-text capitalize">{category}</h1>
      {posts.length === 0 && (
        <p className="mt-6 text-marquee-textDim">
          Nothing crawled in this category yet — check back after the next scheduled run.
        </p>
      )}
      <div className="mt-8 space-y-5">
        {posts.map((p) => (
          <Link
            key={p.slug}
            href={`/blog/${p.slug}`}
            className="ticket p-6 pl-8 block hover:border-marquee-gold transition-colors focus-ring"
          >
            <p className="font-mono text-xs text-marquee-textDim mb-1">
              {new Date(p.published_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              {p.source_name ? ` · via ${p.source_name}` : ""}
            </p>
            <h2 className="font-display text-2xl text-marquee-text">{p.title}</h2>
            <p className="mt-2 text-sm text-marquee-textDim">{p.meta_description}</p>
          </Link>
        ))}
      </div>
      <div className="mt-10">
        <Link href="/blog" className="rounded border border-marquee-line px-4 py-2 text-marquee-text">Back to blog</Link>
      </div>
    </div>
  );
}
