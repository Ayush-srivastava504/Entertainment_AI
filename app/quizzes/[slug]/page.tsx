import { notFound } from "next/navigation";
import { getQuizBySlug } from "@/lib/db";

export const metadata = {
  title: "Quiz — Marquee",
  description: "Take a quiz about your favorite entertainment.",
};

export default async function QuizDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const quiz = await getQuizBySlug(slug);
  if (!quiz) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="font-mono text-xs tracking-[0.3em] text-marquee-gold">🧠 QUIZ</p>
      <h1 className="mt-3 font-display text-5xl text-marquee-text">{quiz.title}</h1>
      <p className="mt-4 text-marquee-textDim">{quiz.description}</p>
    </div>
  );
}
