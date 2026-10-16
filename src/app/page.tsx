"use client";

import { useState } from "react";

const sampleUrls = [
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "https://www.instagram.com/reel/abc123/",
  "https://x.com/i/status/1234567890",
];

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [cookies, setCookies] = useState("");
  const [proxy, setProxy] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, cookies, proxy }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Extraction failed");
      }
      setResult(data);
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-10">
          <p className="mb-2 text-xs uppercase tracking-[0.28em] text-cyan-300">UMD v1</p>
          <h1 className="text-4xl font-bold md:text-6xl">Universal Social Media Downloader</h1>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-cyan-950/30">
            <label className="mb-2 block text-sm font-medium text-slate-200">Media URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500"
            />

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Cookies (optional)</label>
                <textarea
                  value={cookies}
                  onChange={(e) => setCookies(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-500"
                  placeholder="name=value; another=value"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Proxy (optional)</label>
                <textarea
                  value={proxy}
                  onChange={(e) => setProxy(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-cyan-500"
                  placeholder="http://127.0.0.1:8080"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {sampleUrls.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => setUrl(sample)}
                  className="rounded-full border border-cyan-700 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200 transition hover:bg-cyan-500/20"
                >
                  Try sample
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {loading ? "Extracting..." : "Extract media"}
            </button>
          </form>

          <aside className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Status</h2>
            {error ? (
              <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>
            ) : null}

            {result ? (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Title</p>
                  <p className="mt-1 text-lg font-medium text-white">{result.title}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Platform</p>
                  <p className="mt-1 text-base text-slate-200">{result.platform}</p>
                </div>
                <div className="max-h-[24rem] overflow-auto rounded-xl border border-slate-700 bg-slate-950 p-3">
                  {result.formats.map((format: any) => (
                    <div key={`${format.type}-${format.label || format.ext}-${format.index}`} className="mb-2 rounded-lg border border-slate-800 bg-slate-900 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-100">{format.type}</span>
                        <span className="text-xs text-cyan-300">{format.ext}</span>
                      </div>
                      <div className="mt-2 text-xs text-slate-400">
                        {format.label ? `${format.label} · ` : ""}
                        {format.width && format.height ? `${format.width}x${format.height} · ` : ""}
                        {format.filesize ? `${Math.round(format.filesize / 1024 / 1024)} MB` : "Unknown size"}
                      </div>
                      <a
                        href={`/api/media/${result.id}?format=${format.index}&download=1`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block rounded-lg bg-cyan-500 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-cyan-400"
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">No extraction results yet.</p>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
