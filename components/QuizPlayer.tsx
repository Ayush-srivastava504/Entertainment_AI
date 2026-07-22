"use client";

import { useEffect, useState } from "react";
import type { QuizQuestion, QuizResultTier } from "@/lib/db";
import { trackEvent } from "@/lib/analytics";

export default function QuizPlayer({
  slug,
  questions,
  results,
}: {
  slug?: string;
  questions: QuizQuestion[];
  results: QuizResultTier[];
}) {
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  const question = questions[step];
  const isLastQuestion = step + 1 === questions.length;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    trackEvent("quiz_start", { slug, question_count: questions.length });
  }, []);

  function choose(optionIndex: number) {
    if (selected !== null) return; // already answered this question
    setSelected(optionIndex);
    const correct = question.options[optionIndex].correct;
    if (correct) {
      setScore((s) => s + 1);
    }
    trackEvent("quiz_answer", { slug, question_index: step, correct });
  }

  function next() {
    if (isLastQuestion) {
      setFinished(true);
      trackEvent("quiz_complete", {
        slug,
        score,
        question_count: questions.length,
      });
      return;
    }
    setStep((s) => s + 1);
    setSelected(null);
  }

  function restart() {
    setStep(0);
    setScore(0);
    setSelected(null);
    setFinished(false);
  }

  if (finished) {
    const tier =
      results.find((r) => score >= r.minScore && score <= r.maxScore) ??
      results[results.length - 1];

    return (
      <div className="ticket p-8 pl-10">
        <p className="font-mono text-xs text-marquee-gold tracking-marquee mb-2">
          YOUR SCORE
        </p>
        <p className="font-display text-3xl text-marquee-text mb-4">
          {score} / {questions.length}
        </p>
        {tier && (
          <>
            <h2 className="font-display text-4xl text-marquee-text mb-4">
              {tier.title}
            </h2>
            <p className="text-marquee-textDim leading-relaxed mb-8">
              {tier.description}
            </p>
          </>
        )}
        <button
          onClick={restart}
          className="font-mono text-xs text-marquee-gold hover:underline focus-ring"
        >
          ↺ Take it again
        </button>
      </div>
    );
  }

  return (
    <div className="ticket p-8 pl-10">
      <p className="font-mono text-xs text-marquee-textDim mb-2">
        Question {step + 1} of {questions.length} · Score {score}
      </p>
      <h2 className="font-display text-2xl text-marquee-text mb-6">
        {question.text}
      </h2>
      <div className="space-y-3">
        {question.options.map((opt, i) => {
          const answered = selected !== null;
          const isChosen = selected === i;
          const showCorrect = answered && opt.correct;
          const showWrong = answered && isChosen && !opt.correct;

          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={answered}
              className={[
                "w-full text-left rounded border px-4 py-3 transition-colors focus-ring",
                showCorrect
                  ? "border-marquee-gold bg-marquee-gold/10 text-marquee-text"
                  : showWrong
                  ? "border-red-500/60 bg-red-500/10 text-marquee-text"
                  : "border-marquee-line bg-marquee-panel text-marquee-text hover:border-marquee-gold",
                answered ? "cursor-default" : "cursor-pointer",
              ].join(" ")}
            >
              {opt.text}
              {showCorrect && <span className="ml-2">✓</span>}
              {showWrong && <span className="ml-2">✗</span>}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <button
          onClick={next}
          className="mt-6 inline-flex items-center gap-2 rounded bg-marquee-gold px-5 py-2.5 font-semibold text-marquee-bg transition hover:bg-marquee-amber focus-ring"
        >
          {isLastQuestion ? "See my score" : "Next question →"}
        </button>
      )}
    </div>
  );
}
