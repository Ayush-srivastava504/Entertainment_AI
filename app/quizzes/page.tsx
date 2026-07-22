import Link from "next/link";
import { getQuizzes } from "@/lib/db";

export const metadata = {
  title: "Quizzes — Marquee",
  description: "Interactive quizzes about anime and movies.",
};

export const revalidate = 3600;

export default async function QuizzesPage() {
  const quizzes = await getQuizzes(10);

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <p className="font-mono text-xs tracking-[0.3em] text-marquee-gold">🧠 QUIZZES</p>
      <h1 className="mt-3 font-display text-3xl sm:text-5xl text-marquee-text">Quizzes</h1>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {quizzes.map((quiz) => (
          <Link key={quiz.slug} href={`/quiz/${quiz.slug}`} className="ticket p-6 hover:border-marquee-gold transition-colors">
            <h2 className="font-display text-2xl text-marquee-text">{quiz.title}</h2>
            <p className="mt-2 text-sm text-marquee-textDim">{quiz.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
