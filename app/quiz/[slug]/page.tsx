import { redirect } from "next/navigation";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/quizzes/${slug}`);
}
