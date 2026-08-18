/*
This module provides a server-side function to call an external AI text-generation
endpoint. It includes timeout handling, error management, and environment-based
configuration. This code must only run on the server and is used by API routes
for on-demand AI tools.
*/

const DEFAULT_TIMEOUT_MS = 25_000;

export class AiUnavailableError extends Error {}

export async function generateWithAI(
  prompt: string,
  opts: { maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  const url = process.env.HF_SPACE_URL;
  if (!url) {
    throw new AiUnavailableError(
      "HF_SPACE_URL is not configured, so this AI tool is unavailable. " +
        "Set HF_SPACE_URL in your environment to point at an AI endpoint " +
        "to enable it."
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (process.env.HF_TOKEN) {
      headers.Authorization = `Bearer ${process.env.HF_TOKEN}`;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt,
        max_tokens: opts.maxTokens ?? 400,
        temperature: opts.temperature ?? 0.7,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new AiUnavailableError(`AI endpoint responded ${res.status}`);
    }

    const data = (await res.json()) as { text?: string };
    if (!data.text) {
      throw new AiUnavailableError("AI endpoint returned an empty response.");
    }
    return data.text.trim();
  } catch (err) {
    if (err instanceof AiUnavailableError) throw err;
    throw new AiUnavailableError(
      err instanceof Error ? err.message : "AI generation failed."
    );
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Calls Groq's OpenAI-compatible chat-completions endpoint. Separate from
 * generateWithAI (the HF Space endpoint used by the on-demand tools) because
 * it's called from a different context: batch scripts run from crawler/,
 * not request-time API routes, and it needs an explicit model + optional
 * system prompt rather than a single free-form prompt string.
 *
 * Kept deliberately small and dependency-free (raw fetch, no Groq SDK) so it
 * works the same in Next's API routes and in the plain-Node crawler scripts.
 */
export async function generateWithGroq(
  userPrompt: string,
  opts: { system?: string; model?: string; maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new AiUnavailableError(
      "GROQ_API_KEY is not configured, so Groq generation is unavailable."
    );
  }

  const model = opts.model ?? process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const messages = [
      ...(opts.system ? [{ role: "system", content: opts.system }] : []),
      { role: "user", content: userPrompt },
    ];

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: opts.maxTokens ?? 220,
        temperature: opts.temperature ?? 0.6,
      }),
      signal: controller.signal,
    });

    if (res.status === 429) {
      throw new AiUnavailableError("Groq rate limit hit (429).");
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new AiUnavailableError(`Groq responded ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new AiUnavailableError("Groq returned an empty response.");
    }
    return text;
  } catch (err) {
    if (err instanceof AiUnavailableError) throw err;
    throw new AiUnavailableError(
      err instanceof Error ? err.message : "Groq generation failed."
    );
  } finally {
    clearTimeout(timeout);
  }
}