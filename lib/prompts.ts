export type Task =
  | "movie-recommend"
  | "anime-find"
  | "tag-generate"
  | "story-generate"
  | "quiz-generate"
  | "thumbnail-feedback";

/**
 * Every tool on the site calls the same model with a different system
 * framing. Keep instructions tight — small instruct models follow short,
 * concrete instructions far more reliably than long ones.
 */
export function buildPrompt(task: Task, input: Record<string, string>): string {
  switch (task) {
    case "movie-recommend":
      return [
        "You are a knowledgeable film recommender. A user describes what they",
        "want to watch. Reply with exactly 5 recommendations as a numbered",
        "list. For each: Title (Year) — one sentence on why it fits, in plain",
        "language. No preamble, no closing remarks.",
        "",
        `User request: ${input.query}`,
      ].join("\n");

    case "anime-find":
      return [
        "You are an anime encyclopedia. A user describes a plot, character,",
        "or vibe. Reply with exactly 5 matching anime as a numbered list.",
        "For each: Title — one sentence on the match, plus the closest",
        "streaming platform if you're confident of one (otherwise omit it).",
        "No preamble, no closing remarks.",
        "",
        `User description: ${input.query}`,
      ].join("\n");

    case "tag-generate":
      return [
        "You generate discovery tags for creators. Given a video/post topic",
        `and platform "${input.platform}", output ONLY a comma-separated list`,
        "of 15-20 relevant tags/hashtags, lowercase, no explanations, no",
        "numbering, no hash symbols unless the platform is Instagram or TikTok.",
        "",
        `Topic: ${input.query}`,
      ].join("\n");

    case "story-generate":
      return [
        `Write a short story in the ${input.genre} genre, approximately`,
        `${input.length} words long. Main character: ${input.character}.`,
        `Ending style: ${input.ending}.`,
        "Write only the story — no title, no author notes, no commentary.",
      ].join("\n");

    case "quiz-generate":
      return [
        `Write a single quiz question for a "${input.quizTitle}" personality`,
        "quiz. Provide the question and exactly 4 answer options labeled",
        "A-D, one per line, no extra commentary. Each option should map to a",
        "different result/personality type.",
      ].join("\n");

    case "thumbnail-feedback":
      return [
        "You are a YouTube thumbnail consultant. You are given measured",
        "image metrics (not the image itself). Write 3-4 short, specific,",
        "actionable bullet points on how to improve click-through rate,",
        "referencing the actual numbers given. No generic advice, no",
        "preamble.",
        "",
        `Metrics: ${input.metrics}`,
      ].join("\n");

    default:
      throw new Error(`Unknown task: ${task satisfies never}`);
  }
}
