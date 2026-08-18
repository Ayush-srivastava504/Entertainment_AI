

import { getPool, sleep } from "./db.mjs";

const args = process.argv.slice(2);

const arg = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : fallback;
};

const TABLE = arg("table", "movies");
const LIMIT = Number(arg("limit", "1000"));
const DELAY_MS = Number(arg("delay-ms", "2200"));

const MODEL =
  process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!["movies", "anime"].includes(TABLE)) {
  console.error(
    `Unknown --table=${TABLE}, expected "movies" or "anime"`
  );
  process.exit(1);
}

if (!Number.isFinite(LIMIT) || LIMIT <= 0) {
  console.error("--limit must be a positive number");
  process.exit(1);
}

if (!Number.isFinite(DELAY_MS) || DELAY_MS < 0) {
  console.error("--delay-ms must be zero or a positive number");
  process.exit(1);
}

if (!GROQ_API_KEY) {
  console.error(
    "GROQ_API_KEY is not set. Skipping without failing the workflow."
  );
  process.exit(0);
}

function buildPrompt({
  title,
  year,
  genres,
  kind,
  synopsis,
}) {
  return [
    `You write original detail-page copy for a ${kind} database site.`,
    "",
    "Rewrite the synopsis below into 2 short paragraphs.",
    "Write approximately 90-130 words total.",
    "Use completely original wording.",
    "Do not copy phrases from the source.",
    "Explain the premise, tone, genre, and what makes the title distinctive.",
    "Do not include spoilers beyond the basic setup.",
    "Do not use headings.",
    "Do not restate the title.",
    "Do not add a preamble.",
    "Return only the finished prose.",
    "",
    `Title: ${title}${year ? ` (${year})` : ""}`,
    genres?.length
      ? `Genres: ${genres.join(", ")}`
      : "",
    "",
    `Original synopsis: ${synopsis}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function elaborate(row, kind) {
  const title =
    kind === "movie"
      ? row.title
      : row.title_english || row.title;

  const synopsis =
    kind === "movie"
      ? row.description
      : row.synopsis;

  if (!title) {
    throw new Error("missing title");
  }

  if (!synopsis) {
    throw new Error("missing synopsis");
  }

  const prompt = buildPrompt({
    title,
    year: row.year,
    genres: row.genres,
    kind,
    synopsis,
  });

  const res = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_completion_tokens: 500,
        reasoning_effort: "low",
        include_reasoning: false,
        temperature: 0.6,
      }),
    }
  );

  const responseText = await res.text();

  if (res.status === 429) {
    throw new Error(
      `rate limited (429): ${responseText.slice(0, 300)}`
    );
  }

  if (!res.ok) {
    throw new Error(
      `Groq responded ${res.status}: ${responseText.slice(0, 500)}`
    );
  }

  let data;

  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(
      `Groq returned invalid JSON: ${responseText.slice(0, 500)}`
    );
  }

  const choice = data?.choices?.[0];

  if (!choice) {
    throw new Error(
      `Groq returned no choices: ${JSON.stringify(data).slice(0, 500)}`
    );
  }

  const message = choice.message;

  if (!message) {
    throw new Error(
      `Groq returned no message: ${JSON.stringify(choice).slice(0, 500)}`
    );
  }

  const text =
    typeof message.content === "string"
      ? message.content.trim()
      : "";

  if (!text) {
    throw new Error(
      `empty response from Groq: ${JSON.stringify(message).slice(0, 500)}`
    );
  }

  return text;
}

async function main() {
  const pool = getPool();

  const kind =
    TABLE === "movies"
      ? "movie"
      : "anime";

  try {
    const selectSql =
      TABLE === "movies"
        ? `
          SELECT
            id,
            title,
            year,
            genres,
            description
          FROM movies
          WHERE ai_description IS NULL
            AND description IS NOT NULL
          ORDER BY
            watchers DESC NULLS LAST,
            plays DESC NULLS LAST
          LIMIT $1
        `
        : `
          SELECT
            id,
            title,
            title_english,
            year,
            genres,
            synopsis
          FROM anime
          WHERE ai_description IS NULL
            AND synopsis IS NOT NULL
          ORDER BY
            popularity ASC NULLS LAST
          LIMIT $1
        `;

    const { rows } = await pool.query(
      selectSql,
      [LIMIT]
    );

    console.log(
      `[elaborate:${TABLE}] ${rows.length} row(s) queued ` +
      `(limit=${LIMIT}, model=${MODEL}, delay=${DELAY_MS}ms)`
    );

    let done = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        const aiDescription = await elaborate(
          row,
          kind
        );

        await pool.query(
          `
            UPDATE ${TABLE}
            SET
              ai_description = $1,
              ai_description_generated_at = NOW()
            WHERE id = $2
          `,
          [
            aiDescription,
            row.id,
          ]
        );

        done++;

        console.log(
          `[elaborate:${TABLE}] completed ` +
          `id=${row.id} (${done}/${rows.length})`
        );
      } catch (err) {
        failed++;

        const message =
          err instanceof Error
            ? err.message
            : String(err);

        console.warn(
          `[elaborate:${TABLE}] skipped ` +
          `id=${row.id}: ${message}`
        );
      }

      if (DELAY_MS > 0) {
        await sleep(DELAY_MS);
      }
    }

    console.log("");
    console.log(
      `[elaborate:${TABLE}] finished`
    );
    console.log(
      `[elaborate:${TABLE}] queued=${rows.length}`
    );
    console.log(
      `[elaborate:${TABLE}] done=${done}`
    );
    console.log(
      `[elaborate:${TABLE}] failed=${failed}`
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(
    `[elaborate:${TABLE}] fatal:`,
    err
  );

  process.exit(1);
});