"use client";

import ToolShell from "@/components/ToolShell";

export default function QuizPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="font-mono text-xs text-marquee-gold tracking-marquee mb-2">
        🧠 QUIZZES
      </p>
      <h1 className="font-display text-5xl text-marquee-text mb-3">
        AI Personality Quiz Builder
      </h1>
      <p className="text-marquee-textDim mb-8">
        Name a quiz. Generate one question at a time, then string together
        as many as you need.
      </p>
      <ToolShell
        task="quiz-generate"
        showTextarea={false}
        submitLabel="Generate a question"
        extraFields={
          <label className="block text-sm text-marquee-textDim">
            Quiz title
            <input
              name="quizTitle"
              required
              placeholder="e.g. Which Anime Character Are You?"
              className="mt-1 w-full rounded border border-marquee-line bg-marquee-panel px-3 py-2 text-marquee-text placeholder:text-marquee-textDim focus-ring outline-none"
            />
          </label>
        }
        buildInput={(fd) => ({ quizTitle: String(fd.get("quizTitle") || "") })}
      />
    </div>
  );
}
