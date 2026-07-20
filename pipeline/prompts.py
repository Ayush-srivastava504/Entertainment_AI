"""
Port of ../lib/prompts.ts — keep these two files in sync. If you add a task
on the frontend, add the matching branch here too, or that task's queue
jobs will fail every batch run.
"""

VALID_TASKS = {
    "movie-recommend",
    "anime-find",
    "tag-generate",
    "story-generate",
    "quiz-generate",
    "thumbnail-feedback",
}


def build_prompt(task: str, input_: dict) -> str:
    if task == "movie-recommend":
        return (
            "You are a knowledgeable film recommender. A user describes what they\n"
            "want to watch. Reply with exactly 5 recommendations as a numbered\n"
            "list. For each: Title (Year) — one sentence on why it fits, in plain\n"
            "language. No preamble, no closing remarks.\n\n"
            f"User request: {input_.get('query', '')}"
        )

    if task == "anime-find":
        return (
            "You are an anime encyclopedia. A user describes a plot, character,\n"
            "or vibe. Reply with exactly 5 matching anime as a numbered list.\n"
            "For each: Title — one sentence on the match, plus the closest\n"
            "streaming platform if you're confident of one (otherwise omit it).\n"
            "No preamble, no closing remarks.\n\n"
            f"User description: {input_.get('query', '')}"
        )

    if task == "tag-generate":
        platform = input_.get("platform", "YouTube")
        return (
            "You generate discovery tags for creators. Given a video/post topic\n"
            f'and platform "{platform}", output ONLY a comma-separated list\n'
            "of 15-20 relevant tags/hashtags, lowercase, no explanations, no\n"
            "numbering, no hash symbols unless the platform is Instagram or TikTok.\n\n"
            f"Topic: {input_.get('query', '')}"
        )

    if task == "story-generate":
        return (
            f"Write a short story in the {input_.get('genre', 'Fantasy')} genre, approximately\n"
            f"{input_.get('length', '400')} words long. Main character: {input_.get('character', '')}.\n"
            f"Ending style: {input_.get('ending', 'Bittersweet')}.\n"
            "Write only the story — no title, no author notes, no commentary."
        )

    if task == "quiz-generate":
        quiz_title = input_.get("quizTitle", "")
        return (
            f'Write a single quiz question for a "{quiz_title}" personality\n'
            "quiz. Provide the question and exactly 4 answer options labeled\n"
            "A-D, one per line, no extra commentary. Each option should map to a\n"
            "different result/personality type."
        )

    if task == "thumbnail-feedback":
        return (
            "You are a YouTube thumbnail consultant. You are given measured\n"
            "image metrics (not the image itself). Write 3-4 short, specific,\n"
            "actionable bullet points on how to improve click-through rate,\n"
            "referencing the actual numbers given. No generic advice, no\n"
            "preamble.\n\n"
            f"Metrics: {input_.get('metrics', '')}"
        )

    raise ValueError(f"Unknown task: {task}")


def max_tokens_for(task: str) -> int:
    return 700 if task == "story-generate" else 350


def temperature_for(task: str) -> float:
    return 0.9 if task == "story-generate" else 0.7
