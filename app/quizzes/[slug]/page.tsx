import { notFound } from "next/navigation";
import { getQuizBySlug } from "@/lib/db";
import QuizPlayer from "@/components/QuizPlayer";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const quiz = await getQuizBySlug(slug);
  if (!quiz) return {};

  const url = `${BASE_URL}/quizzes/${slug}`;
  return {
    title: `${quiz.title} — Marquee`,
    description: quiz.description,
    alternates: { canonical: url },
    openGraph: {
      title: quiz.title,
      description: quiz.description,
      url,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: quiz.title,
      description: quiz.description,
    },
  };
}

export default async function QuizDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const quiz = await getQuizBySlug(slug);
  if (!quiz) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Quiz",
    name: quiz.title,
    description: quiz.description,
    url: `${BASE_URL}/quizzes/${slug}`,
    numberOfQuestions: quiz.questions.length,
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <p className="font-mono text-xs tracking-[0.3em] text-marquee-gold">🧠 QUIZ</p>
      <h1 className="mt-3 font-display text-5xl text-marquee-text">{quiz.title}</h1>
      <p className="mt-4 text-marquee-textDim">{quiz.description}</p>

      <div className="mt-10">
        <QuizPlayer questions={quiz.questions} results={quiz.results} />
      </div>
    </div>
  );
}
