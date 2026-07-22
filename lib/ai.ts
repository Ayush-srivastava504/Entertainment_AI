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