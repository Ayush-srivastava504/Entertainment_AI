"use client";

import ToolShell from "@/components/ToolShell";

export default function TagGeneratorPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="font-mono text-xs text-marquee-gold tracking-marquee mb-2">
        🏷 CREATOR TOOLS
      </p>
      <h1 className="font-display text-3xl sm:text-5xl text-marquee-text mb-3">
        AI Tag Generator
      </h1>
      <p className="text-marquee-textDim mb-8">
        Describe your video or post. Get platform-ready tags.
      </p>
      <ToolShell
        task="tag-generate"
        placeholder="e.g. a 10-minute video reviewing budget mechanical keyboards"
        submitLabel="Generate tags"
        textareaName="query"
        extraFields={
          <label className="block text-sm text-marquee-textDim">
            Platform
            <select
              name="platform"
              className="mt-1 w-full rounded border border-marquee-line bg-marquee-panel px-3 py-2 text-marquee-text focus-ring outline-none"
              defaultValue="YouTube"
            >
              <option>YouTube</option>
              <option>Instagram</option>
              <option>TikTok</option>
              <option>Blog</option>
            </select>
          </label>
        }
        buildInput={(fd) => ({
          query: String(fd.get("query") || ""),
          platform: String(fd.get("platform") || "YouTube"),
        })}
      />
    </div>
  );
}
