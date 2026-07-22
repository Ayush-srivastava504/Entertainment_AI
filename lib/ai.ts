/**
 * Server-only call to the free-tier Hugging Face Space defined in
 * `hf-space/` (see hf-space/README.md). This is what replaced the old
 * EC2 batch pipeline: instead of queuing a job and waiting for a daily
 * batch run to drain it, API routes call this directly and return the
 * result in the same request.
 *
 * NEVER import this from a client component — HF_SPACE_URL/HF_TOKEN must
 * stay server-side. All callers of buildPrompt/generateWithAI live under
 * app/api/**\/route.ts, which only ever run on the server.
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
      "HF_SPACE_URL is not configured. Deploy hf-space/ and set HF_SPACE_URL " +
        "in your environment to enable this tool."
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    // Only needed if the Space is private — see hf-space/README.md.
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
      throw new AiUnavailableError(`HF Space responded ${res.status}`);
    }

    const data = (await res.json()) as { text?: string };
    if (!data.text) {
      throw new AiUnavailableError("HF Space returned an empty response.");
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
