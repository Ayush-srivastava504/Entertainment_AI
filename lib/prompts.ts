/*
This module defines the AI task types and builds system prompts for various
content generation tools. Each task uses a specific instructional format
tailored to the model's capabilities and the tool's requirements.
*/

export type Task =
  | "movie-recommend"
  | "anime-find"
  | "tag-generate"
  | "story-generate"
  | "thumbnail-feedback"
  | "shorts-generate";

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

    case "shorts-generate":
      return [
        "You write vertical story-card sets (like Instagram/TikTok Stories) for",
        "a movie/anime database page. Given a title's real data below, output",
        "ONLY a JSON array of 5 objects, each { \"heading\": string (max 6 words),",
        "\"text\": string (max 220 characters) }. Card 1 is a hook. Cards 2-4 cover",
        "distinct angles (premise, standout element, vibe/tone, who it's for) —",
        "never restate the synopsis verbatim. Card 5 is a closing line inviting",
        "the reader to open the full page. No preamble, no markdown fences, no",
        "commentary — the response must be valid JSON and nothing else.",
        "",
        `Title: ${input.title}`,
        input.year ? `Year: ${input.year}` : "",
        input.genres ? `Genres: ${input.genres}` : "",
        input.score ? `Score: ${input.score}/10` : "",
        input.synopsis ? `Known synopsis: ${input.synopsis}` : "",
      ]
        .filter(Boolean)
        .join("\n");

    default:
      throw new Error(`Unknown task: ${task satisfies never}`);
  }
}