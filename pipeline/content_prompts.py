"""
Prompts + topic pools for the autonomous content pipeline
(generate_content.py). Nothing here takes user input — topics are picked
from the lists below, in order, skipping anything whose slug already
exists in the DB.

Keep each generator asking for STRICT JSON and nothing else. The model is
a small instruct model (0.5B by default) running on a t2.micro, so responses are
parsed defensively in generate_content.py (repair-attempt + skip-on-
failure, never crash the whole run over one bad item).
"""
import re

# ---------------------------------------------------------------------
# Topic pools. Picked in order; once all are used the picker starts
# recycling them with a "Redux" suffix (see next_topic() in
# generate_content.py) rather than ever blocking on new topics.
# ---------------------------------------------------------------------

BLOG_TOPICS = [
    "One Piece Watch Order: The Fastest Way In",
    "The MCU Timeline, In the Order Things Actually Happened",
    "Studio Ghibli Watch Order: Where To Start",
    "How Attack on Titan's Timeline Actually Fits Together",
    "The Best Anime Openings of All Time, and Why They Work",
    "Dubbed vs Subbed: Does It Actually Matter?",
    "How Long-Running Shonen Anime Handle Filler Arcs",
    "The Dark Knight Trilogy: Watch Order and Why It Matters",
    "Isekai Anime: Why the Genre Took Over",
    "The Fastest Way to Catch Up on Doctor Who",
    "How to Pick Your Next Anime Based on What You Just Finished",
    "Slow Burn vs Fast Burn: Two Kinds of Anime Romance",
    "The Case for Watching Movie Franchises Out of Release Order",
    "What Makes a Good Anime Filler Arc (and a Bad One)",
    "A Beginner's Guide to Japanese Animation Studios",
    "The Best Movie Trilogies That Actually Stick the Landing",
    "Why Some Anime Adaptations Outpace Their Source Manga",
    "How to Watch the Pokémon Anime Without Losing Your Mind",
    "The Best Non-Marvel Superhero Movies Worth Your Time",
    "Understanding the Difference Between Seinen and Shonen",
    "The Best Movies to Watch After You Finish a Long Anime",
    "How Time-Loop Anime Keep Their Premise From Getting Stale",
    "A Practical Guide to Anime Movie Canon vs Filler Movies",
    "The Best Directors Working in Animation Right Now",
    "Why Character Design Changes Between Anime Seasons",
    "The Best Horror Movies That Aren't Just Jump Scares",
    "How to Talk Your Friends Into Watching Anime",
    "The Best Video Game Adaptations, Ranked by How Faithful They Are",
    "A Guide to Anime Sequels That Are Worth Watching",
    "The Best Coming-of-Age Movies Across Different Decades",
]

MOVIE_RANKING_TOPICS = [
    "Best Heist Movies",
    "Best Time Travel Movies",
    "Best Courtroom Dramas",
    "Best Movies Based on True Stories",
    "Best Sci-Fi Movies of the Last Decade",
    "Best Slow-Burn Thrillers",
    "Best Movies About Friendship",
    "Best Underrated Action Movies",
    "Best Movie Villains, Ranked",
    "Best One-Location Movies",
    "Best Road Trip Movies",
    "Best Movies With Twist Endings",
    "Best War Movies That Aren't About Glory",
    "Best Comfort Movies for a Bad Day",
    "Best Movies About Obsession",
    "Best Ensemble Cast Movies",
    "Best Movies Under 90 Minutes",
    "Best Revenge Movies",
    "Best Movies About Artificial Intelligence",
    "Best Underdog Sports Movies",
]

ANIME_RANKING_TOPICS = [
    "Best Romance Anime",
    "Best Sci-Fi Anime",
    "Best Anime for Beginners",
    "Best Psychological Anime",
    "Best Slice-of-Life Anime",
    "Best Anime Villains, Ranked",
    "Best Sports Anime",
    "Best Anime Movies (Not Series)",
    "Best Isekai Anime That Subvert the Genre",
    "Best Short Anime Under 13 Episodes",
    "Best Anime Soundtracks",
    "Best Mecha Anime",
    "Best Anime About Found Family",
    "Best Anime With Strong Female Leads",
    "Best Underrated Anime Nobody Talks About",
    "Best Anime for People Who Don't Watch Anime",
    "Best Anime Comedies",
    "Best Anime With Time Skips Done Right",
    "Best Anime Rivalries",
    "Best Anime Endings That Actually Land",
]

QUIZ_TOPICS = [
    "Which Studio Ghibli Character Are You?",
    "Which Anime Protagonist Are You?",
    "What Kind of Movie Villain Would You Be?",
    "Which Classic Sitcom Character Matches Your Vibe?",
    "What's Your Anime Fighting Style?",
    "Which Movie Genre Fits Your Personality?",
    "Which Shonen Anime Squad Would You Join?",
    "What Kind of Horror Movie Character Would You Survive As?",
    "Which Sci-Fi Universe Should You Actually Live In?",
    "Which Heist Movie Role Would You Play?",
    "What's Your Anime Power-Up Trigger?",
    "Which Rom-Com Trope Are You?",
]


def _system_json_instruction(schema_hint: str) -> str:
    return (
        "You output ONLY valid JSON. No markdown fences, no preamble, no "
        "commentary before or after — the very first character of your "
        f"reply must be '{{' and the very last must be '}}'.\n\n{schema_hint}"
    )


def blog_prompt(topic: str, reference_titles: list | None = None) -> str:
    schema = (
        'Schema: {"title": string, "meta_description": string (<160 chars), '
        '"body": array of 4 strings, each a substantial paragraph (3-5 sentences) '
        "of a blog post about the topic. Write like a knowledgeable, opinionated "
        "entertainment blogger — concrete claims, no filler, no 'in conclusion'.}"
    )
    prompt = _system_json_instruction(schema) + f'\n\nTopic: "{topic}"'
    if reference_titles:
        titles = ", ".join(reference_titles)
        prompt += (
            "\n\nIf you name specific anime, prefer these real titles where "
            "relevant (don't force all of them in, and only mention others "
            f"you're confident are real): {titles}"
        )
    return prompt


def ranking_prompt(category: str, topic: str) -> str:
    noun = "movies" if category == "movie" else "anime"
    schema = (
        'Schema: {"title": string, "meta_description": string (<160 chars), '
        '"intro": string (2-3 sentences introducing the list), '
        '"items": array of exactly 5 objects, each '
        '{"title": string (real ' + noun + ' title), "year": number (release year), '
        '"blurb": string (1-2 sentences on why it earns its spot)}. '
        "Order items from best (rank 1) to fifth-best. Use real, well-known titles only.}"
    )
    return (
        _system_json_instruction(schema)
        + f'\n\nRanking topic: "{topic}" ({noun})'
    )


def grounded_ranking_prompt(topic: str, candidates: list) -> str:
    """Anime rankings only: instead of asking the model to invent titles
    (which a small model does unreliably), give it a shortlist of REAL
    titles from anime_catalog.py and have it pick + order 5 of them and
    write the surrounding text. It cannot introduce a title that isn't in
    the list -- generate_content.py enforces that after parsing too."""
    candidate_lines = "\n".join(
        f'- "{title}" ({year})' for title, year in candidates
    )
    schema = (
        'Schema: {"title": string, "meta_description": string (<160 chars), '
        '"intro": string (2-3 sentences introducing the list), '
        '"items": array of exactly 5 objects, each '
        '{"title": string (MUST be copied exactly from the candidate list '
        'below, do not alter it), "year": number (use the year given for '
        "that title), \"blurb\": string (1-2 sentences on why it earns its "
        'spot)}. Order items from best (rank 1) to fifth-best. Pick exactly '
        "5 DIFFERENT titles from the candidate list -- never invent a title "
        "that isn't in it.}"
    )
    return (
        _system_json_instruction(schema)
        + f'\n\nRanking topic: "{topic}" (anime)'
        + f"\n\nCandidate titles (pick 5 of these, don't invent others):\n{candidate_lines}"
    )


def quiz_prompt(topic: str, reference_titles: list | None = None) -> str:
    schema = (
        'Schema: {"description": string (1 sentence describing the quiz), '
        '"results": array of exactly 4 objects, each {"key": single letter '
        '"A"|"B"|"C"|"D", "title": string (the result name), "description": '
        "string (2-3 sentences describing someone who gets this result)}, "
        '"questions": array of exactly 5 objects, each {"text": string (the '
        'question), "options": array of exactly 4 objects, each {"text": string '
        '(the answer choice), "result": single letter matching one of the '
        "results' keys}}. Every result key (A-D) should be reachable — spread "
        "options across all 4 results roughly evenly across the 5 questions.}"
    )
    prompt = _system_json_instruction(schema) + f'\n\nQuiz topic: "{topic}"'
    if reference_titles:
        titles = ", ".join(reference_titles)
        prompt += (
            "\n\nIf this quiz references specific anime or characters, prefer "
            f"grounding it in these real, well-known titles: {titles}"
        )
    return prompt


def extract_json_object(text: str) -> str:
    """Best-effort extraction of a single JSON object from model output that
    may include stray markdown fences or commentary despite instructions."""
    text = text.strip()
    text = re.sub(r"^```(json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found in model output")
    return text[start : end + 1]


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"[\s-]+", "-", text)
    return text.strip("-")
