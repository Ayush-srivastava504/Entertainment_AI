export interface RankingItem {
  title: string;
  year: number;
  blurb: string;
}

export interface Ranking {
  slug: string;
  title: string;
  metaDescription: string;
  intro: string;
  items: RankingItem[];
}

/**
 * These lists are curated/editorial content, not generated per-request —
 * that's the point. AI chat pages don't get indexed or linked the way
 * static, crawlable pages do. Regenerate this file periodically (e.g. a
 * scheduled script that asks the model to draft candidates, then a human
 * reviews before it ships) rather than rendering it live per visitor.
 */
export const animeRankings: Ranking[] = [
  {
    slug: "best-romance-anime",
    title: "Best Romance Anime",
    metaDescription:
      "The romance anime worth your time, from slow-burn dramas to breezy rom-coms.",
    intro:
      "Romance anime ranges from quiet, unresolved yearning to full-speed rom-com chaos. This list leans toward series with a genuine emotional arc rather than fan-service pairing bait.",
    items: [
      { title: "Toradora!", year: 2008, blurb: "Two mismatched roommates-in-crime end up understanding each other better than anyone expected — still the reference point for the genre." },
      { title: "Your Lie in April", year: 2014, blurb: "A pianist frozen by grief is pulled back into music by a violinist who refuses to play by the rules." },
      { title: "Horimiya", year: 2021, blurb: "Skips the usual will-they-won't-they stall and gets the leads together early, then explores what comes after." },
      { title: "Kaguya-sama: Love Is War", year: 2019, blurb: "Two student council geniuses wage psychological warfare rather than admit they like each other." },
      { title: "Nana", year: 2006, blurb: "Two women named Nana, one shared apartment, and a much heavier exploration of ambition and codependency than the premise suggests." },
    ],
  },
  {
    slug: "best-sci-fi-anime",
    title: "Best Sci-Fi Anime",
    metaDescription:
      "Sci-fi anime that treats its ideas seriously — space opera, cyberpunk, and time-bending thrillers.",
    intro:
      "The best sci-fi anime uses its premise to ask an actual question, not just as scenery. These are the ones that hold up on a rewatch.",
    items: [
      { title: "Steins;Gate", year: 2011, blurb: "A microwave-turned-time-machine spirals into one of anime's tightest, most paranoid plots." },
      { title: "Cowboy Bebop", year: 1998, blurb: "Bounty hunters drifting through a lived-in solar system — jazz-scored, episodic, and quietly about people who can't move on." },
      { title: "Ghost in the Shell: Stand Alone Complex", year: 2002, blurb: "Cybernetic identity and networked consciousness, explored through a procedural cop-show structure." },
      { title: "Made in Abyss", year: 2017, blurb: "Looks like a children's adventure, functions like body-horror sci-fi about a bottomless pit that rewrites you as you descend." },
      { title: "Vivy: Fluorescent Arcsong", year: 2021, blurb: "An AI singer is tasked with preventing a century-spanning AI uprising, one timeline-hopping mission at a time." },
    ],
  },
  {
    slug: "best-anime-for-beginners",
    title: "Best Anime for Beginners",
    metaDescription:
      "Where to start with anime if you've never watched a series before.",
    intro:
      "The best entry points are complete, well-paced, and don't assume any prior familiarity with anime conventions.",
    items: [
      { title: "Fullmetal Alchemist: Brotherhood", year: 2009, blurb: "A complete, self-contained story with a satisfying ending — rare in a medium full of open-ended sequels." },
      { title: "Death Note", year: 2006, blurb: "A cat-and-mouse thriller that hooks non-anime-watchers as reliably as anything in the medium." },
      { title: "Spy x Family", year: 2022, blurb: "A spy, an assassin, and a telepath accidentally form a fake family — funny, fast, and low-commitment per episode." },
      { title: "My Hero Academia", year: 2016, blurb: "A superhero-school framework that's instantly legible even with zero anime background." },
      { title: "A Silent Voice", year: 2016, blurb: "A single film, not a series — a real commitment-free way to see what anime filmmaking can do." },
    ],
  },
];

export const movieRankings: Ranking[] = [
  {
    slug: "best-horror-movies-on-netflix",
    title: "Best Horror Movies on Netflix",
    metaDescription:
      "The horror movies on Netflix actually worth watching, updated periodically as the catalog changes.",
    intro:
      "Streaming catalogs rotate constantly, so treat this as a snapshot — verify availability before you commit to a Friday night pick.",
    items: [
      { title: "His House", year: 2020, blurb: "A refugee couple's new home is haunted by more than trauma — one of the sharper horror premises of the last decade." },
      { title: "Fear Street Trilogy", year: 2021, blurb: "Three interconnected slasher films across three decades, released weekly — a genuinely fun binge format." },
      { title: "Gerald's Game", year: 2017, blurb: "A Stephen King adaptation that turns a single-location premise into real psychological dread." },
      { title: "The Platform", year: 2019, blurb: "A vertical prison where food descends floor by floor — social horror with a blunt, effective metaphor." },
    ],
  },
  {
    slug: "hidden-netflix-gems",
    title: "Hidden Netflix Gems",
    metaDescription:
      "Lower-profile movies on Netflix that deserve more attention than the algorithm gives them.",
    intro:
      "Not everything great on a streaming service gets pushed to the front page. These are worth actively searching for.",
    items: [
      { title: "I'm Thinking of Ending Things", year: 2020, blurb: "A deliberately disorienting relationship drama that rewards a second watch more than a first." },
      { title: "Okja", year: 2017, blurb: "A girl and her genetically engineered pig versus a corporation — sincere, strange, and undersold by its own poster." },
      { title: "The Endless", year: 2017, blurb: "A low-budget, high-concept film about two brothers returning to the cult they escaped." },
    ],
  },
];

export function getAnimeRanking(slug: string) {
  return animeRankings.find((r) => r.slug === slug);
}

export function getMovieRanking(slug: string) {
  return movieRankings.find((r) => r.slug === slug);
}
