import Link from "next/link";

export const metadata = {
  title: "Quiz Results — Marquee",
  description: "View your quiz results.",
};

export default async function QuizResultsPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="font-mono text-xs tracking-[0.3em] text-marquee-gold">🧠 RESULTS</p>
      <h1 className="mt-3 font-display text-5xl text-marquee-text">Your result</h1>
      <p className="mt-4 text-marquee-textDim">Attempt ID: {attemptId}</p>
      <div className="mt-8">
        <Link href="/quizzes" className="rounded border border-marquee-line px-4 py-2 text-marquee-text">Back to quizzes</Link>
      </div>
    </div>
  );
}
