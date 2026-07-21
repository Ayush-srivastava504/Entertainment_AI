import Link from "next/link";
import { getQuizzes } from "@/lib/db";

export const metadata = {
  title: "Quizzes — Marquee",
  description: "Personality quizzes about movies and anime.",
};

export const revalidate = 3600;

export default async function QuizIndex() {
  const quizzes = await getQuizzes();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="font-mono text-xs text-marquee-gold tracking-marquee mb-2">
        🧠 QUIZZES
      </p>
      <h1 className="font-display text-5xl text-marquee-text mb-8">
        Quizzes
      </h1>
      {quizzes.length === 0 && (
        <p className="text-marquee-textDim">
          Nothing published yet — check back after the next daily run.
        </p>
      )}
      <div className="space-y-5">
        {quizzes.map((q) => (
          <Link
            key={q.slug}
            href={`/quiz/${q.slug}`}
            className="ticket p-6 pl-8 block hover:border-marquee-gold transition-colors focus-ring"
          >
            <h2 className="font-display text-2xl text-marquee-text mb-1">
              {q.title}
            </h2>
            <p className="text-sm text-marquee-textDim">{q.description}</p>
            <p className="font-mono text-xs text-marquee-textDim mt-2">
              {q.questions.length} questions
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
