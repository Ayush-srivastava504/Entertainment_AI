import { notFound } from "next/navigation";
import { getQuizBySlug } from "@/lib/db";
import QuizPlayer from "@/components/QuizPlayer";
import LikeButton from "@/components/LikeButton";
import CommentSection from "@/components/CommentSection";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const quiz = await getQuizBySlug(slug);
  if (!quiz) return {};
  return { title: `${quiz.title} — Marquee`, description: quiz.description };
}

export default async function QuizPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const quiz = await getQuizBySlug(slug);
  if (!quiz) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <p className="font-mono text-xs text-marquee-gold tracking-marquee mb-2">
        🧠 QUIZ
      </p>
      <h1 className="font-display text-5xl text-marquee-text mb-3">
        {quiz.title}
      </h1>
      <p className="text-marquee-textDim mb-4">{quiz.description}</p>
      <div className="mb-8">
        <LikeButton type="quiz" slug={quiz.slug} initialLikes={quiz.likes} />
      </div>
      <QuizPlayer questions={quiz.questions} results={quiz.results} />
      <CommentSection type="quiz" slug={quiz.slug} />
    </div>
  );
}
