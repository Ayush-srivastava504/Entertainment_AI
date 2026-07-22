import { notFound } from "next/navigation";
import { getBlogPostBySlug } from "@/lib/db";
import LikeButton from "@/components/LikeButton";
import CommentSection from "@/components/CommentSection";

export const revalidate = 300;
// Slugs are DB-driven (written by the scheduled blog crawler), not known at
// build time, so no generateStaticParams — Next.js renders on-demand and
// caches per the revalidate window above.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) return {};
  return { title: `${post.title} — Marquee`, description: post.meta_description };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-2xl px-6 py-16">
      <p className="font-mono text-xs text-marquee-textDim mb-2">
        {new Date(post.published_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>
      <h1 className="font-display text-3xl sm:text-5xl text-marquee-text mb-4">
        {post.title}
      </h1>
      <div className="mb-8">
        <LikeButton type="blog" slug={post.slug} initialLikes={post.likes} />
      </div>
      {post.source_name && post.source_url && (
        <p className="mb-6 text-sm text-marquee-textDim">
          Original story via{" "}
          <a href={post.source_url} target="_blank" rel="noopener noreferrer" className="text-marquee-gold hover:underline">
            {post.source_name}
          </a>
        </p>
      )}
      <div className="space-y-4 text-marquee-text leading-relaxed">
        {post.body.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
      <CommentSection type="blog" slug={post.slug} />
    </article>
  );
}
