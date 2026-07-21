"use client";

import { useState } from "react";
import type { QuizQuestion, QuizResult } from "@/lib/db";

export default function QuizPlayer({
  questions,
  results,
}: {
  questions: QuizQuestion[];
  results: QuizResult[];
}) {
  const [step, setStep] = useState(0);
  const [tally, setTally] = useState<Record<string, number>>({});
  const [finalResult, setFinalResult] = useState<QuizResult | null>(null);

  function choose(resultKey: string) {
    const next = { ...tally, [resultKey]: (tally[resultKey] || 0) + 1 };
    setTally(next);

    if (step + 1 < questions.length) {
      setStep(step + 1);
      return;
    }

    // Quiz complete — pick the most-picked result key.
    let winner = results[0];
    let best = -1;
    for (const r of results) {
      const count = next[r.key] || 0;
      if (count > best) {
        best = count;
        winner = r;
      }
    }
    setFinalResult(winner);
  }

  function restart() {
    setStep(0);
    setTally({});
    setFinalResult(null);
  }

  if (finalResult) {
    return (
      <div className="ticket p-8 pl-10">
        <p className="font-mono text-xs text-marquee-gold tracking-marquee mb-2">
          YOUR RESULT
        </p>
        <h2 className="font-display text-4xl text-marquee-text mb-4">
          {finalResult.title}
        </h2>
        <p className="text-marquee-textDim leading-relaxed mb-8">
          {finalResult.description}
        </p>
        <button
          onClick={restart}
          className="font-mono text-xs text-marquee-gold hover:underline focus-ring"
        >
          ↺ Take it again
        </button>
      </div>
    );
  }

  const question = questions[step];

  return (
    <div className="ticket p-8 pl-10">
      <p className="font-mono text-xs text-marquee-textDim mb-2">
        Question {step + 1} of {questions.length}
      </p>
      <h2 className="font-display text-2xl text-marquee-text mb-6">
        {question.text}
      </h2>
      <div className="space-y-3">
        {question.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => choose(opt.result)}
            className="w-full text-left rounded border border-marquee-line bg-marquee-panel px-4 py-3 text-marquee-text hover:border-marquee-gold transition-colors focus-ring"
          >
            {opt.text}
          </button>
        ))}
      </div>
    </div>
  );
}
