"use client";

import { useRef, useState } from "react";

interface Metrics {
  width: number;
  height: number;
  aspectRatio: string;
  avgBrightness: number; // 0-255
  contrast: number; // stddev of luminance, 0-255ish
  edgeDensity: number; // rough proxy for text/detail, 0-1
  warningAspect: boolean;
}

/** Cheap client-side image analysis — no server upload needed for the numbers. */
function analyzeImage(img: HTMLImageElement): Metrics {
  const canvas = document.createElement("canvas");
  const w = (canvas.width = 200); // downscale for speed; ratios still hold
  const h = (canvas.height = Math.round((img.naturalHeight / img.naturalWidth) * 200));
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  const luminances: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    luminances.push(0.2126 * r + 0.7152 * g + 0.0722 * b);
  }

  const avg = luminances.reduce((a, b) => a + b, 0) / luminances.length;
  const variance =
    luminances.reduce((a, l) => a + (l - avg) ** 2, 0) / luminances.length;
  const stddev = Math.sqrt(variance);

  // Edge density: fraction of pixels whose luminance differs sharply from
  // the pixel to their left — a rough, fast stand-in for "how much detail /
  // text is packed into the frame."
  let edgeCount = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 1; x < w; x++) {
      const i = (y * w + x) * 4;
      const iPrev = (y * w + x - 1) * 4;
      const l1 = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      const l0 =
        0.2126 * data[iPrev] + 0.7152 * data[iPrev + 1] + 0.0722 * data[iPrev + 2];
      if (Math.abs(l1 - l0) > 40) edgeCount++;
    }
  }
  const edgeDensity = edgeCount / (w * h);

  const ratio = img.naturalWidth / img.naturalHeight;
  const isRoughly16x9 = Math.abs(ratio - 16 / 9) < 0.15;

  return {
    width: img.naturalWidth,
    height: img.naturalHeight,
    aspectRatio: ratio.toFixed(2),
    avgBrightness: Math.round(avg),
    contrast: Math.round(stddev),
    edgeDensity: Number(edgeDensity.toFixed(3)),
    warningAspect: !isRoughly16x9,
  };
}

export default function ThumbnailRatingPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setError(null);
    setFeedback(null);
    const url = URL.createObjectURL(file);
    setPreview(url);

    const img = new Image();
    img.onload = () => setMetrics(analyzeImage(img));
    img.onerror = () => setError("Couldn't read that image file.");
    img.src = url;
  }

  async function getFeedback() {
    if (!metrics) return;
    setLoading(true);
    setError(null);
    try {
      const metricsSummary = [
        `${metrics.width}x${metrics.height}px (ratio ${metrics.aspectRatio}${
          metrics.warningAspect ? ", NOT close to 16:9" : ", ~16:9"
        })`,
        `average brightness ${metrics.avgBrightness}/255`,
        `contrast (stddev) ${metrics.contrast}`,
        `edge/detail density ${metrics.edgeDensity} (0=flat, higher=busier)`,
      ].join("; ");

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "thumbnail-feedback",
          input: { metrics: metricsSummary },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Feedback failed.");
      setFeedback(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feedback failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="font-mono text-xs text-marquee-gold tracking-marquee mb-2">
        🖼 CREATOR TOOLS
      </p>
      <h1 className="font-display text-5xl text-marquee-text mb-3">
        AI Thumbnail Rating
      </h1>
      <p className="text-marquee-textDim mb-8">
        Metrics are computed in your browser (brightness, contrast, aspect
        ratio, detail density). The AI only ever sees the numbers, not the
        image — so it can&apos;t actually &quot;see&quot; the thumbnail, but
        it can reason about what the numbers mean for CTR.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <button
        onClick={() => fileRef.current?.click()}
        className="rounded border border-marquee-line px-5 py-2.5 font-semibold text-marquee-text hover:border-marquee-gold transition focus-ring"
      >
        Choose thumbnail image
      </button>

      {preview && (
        <div className="mt-8 grid sm:grid-cols-2 gap-6 items-start">
          <img
            src={preview}
            alt="Uploaded thumbnail preview"
            className="w-full rounded border border-marquee-line"
          />
          {metrics && (
            <div className="ticket p-6 pl-8 text-sm font-mono text-marquee-textDim space-y-1">
              <p>size: {metrics.width}×{metrics.height}px</p>
              <p>
                aspect ratio: {metrics.aspectRatio}{" "}
                {metrics.warningAspect && (
                  <span className="text-marquee-amber">⚠ not 16:9</span>
                )}
              </p>
              <p>brightness: {metrics.avgBrightness}/255</p>
              <p>contrast: {metrics.contrast}</p>
              <p>edge density: {metrics.edgeDensity}</p>
            </div>
          )}
        </div>
      )}

      {metrics && (
        <button
          onClick={getFeedback}
          disabled={loading}
          className="mt-6 inline-flex items-center gap-2 rounded bg-marquee-gold px-5 py-2.5 font-semibold text-marquee-bg hover:bg-marquee-amber transition disabled:opacity-50 focus-ring"
        >
          {loading ? "Analyzing…" : "Get AI feedback"}
        </button>
      )}

      {error && (
        <p className="mt-4 text-sm text-marquee-amber font-mono">⚠ {error}</p>
      )}

      {feedback && (
        <div className="mt-6 ticket p-6 pl-8 whitespace-pre-wrap leading-relaxed text-marquee-text">
          {feedback}
        </div>
      )}
    </div>
  );
}
