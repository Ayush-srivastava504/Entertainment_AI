import Link from "next/link";
import { blogPosts } from "@/lib/content/blog";

export const metadata = {
  title: "Blog — Marquee",
  description: "Watch orders, timelines, and deep dives on movies and anime.",
};

export default function BlogIndex() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="font-mono text-xs text-marquee-gold tracking-marquee mb-2">
        📝 BLOG
      </p>
      <h1 className="font-display text-5xl text-marquee-text mb-8">
        From the Marquee
      </h1>
      <div className="space-y-5">
        {blogPosts.map((p) => (
          <Link
            key={p.slug}
            href={`/blog/${p.slug}`}
            className="ticket p-6 pl-8 block hover:border-marquee-gold transition-colors focus-ring"
          >
            <p className="font-mono text-xs text-marquee-textDim mb-1">
              {new Date(p.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            <h2 className="font-display text-2xl text-marquee-text mb-1">
              {p.title}
            </h2>
            <p className="text-sm text-marquee-textDim">{p.metaDescription}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
