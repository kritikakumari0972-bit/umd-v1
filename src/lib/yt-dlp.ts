import { spawn } from "node:child_process";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";
import { safeDownloadName } from "@/lib/filename";

export type ExtractionFormat = {
  type: string;
  label?: string;
  ext: string;
  width?: number;
  height?: number;
  filesize?: number;
  hasAudio?: boolean;
  url?: string;
  format_id?: string;
  format?: string;
};

export type Extraction = {
  id: string;
  title: string;
  thumbnail?: string;
  duration?: number;
  uploader?: string;
  platform: string;
  sourceUrl: string;
  formats: ExtractionFormat[];
  infoPath?: string;
  cookies?: string;
  proxy?: string;
};

const storeRoot = path.join(process.cwd(), ".data", "extracts");

export function cleanupStore() {
  mkdirSync(storeRoot, { recursive: true });
}

export function saveExtraction(extraction: Extraction) {
  mkdirSync(storeRoot, { recursive: true });
  const file = path.join(storeRoot, `${extraction.id}.json`);
  writeFileSync(file, JSON.stringify(extraction, null, 2), "utf8");
  return file;
}

export function getExtraction(id: string): Extraction | null {
  const file = path.join(storeRoot, `${id}.json`);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as Extraction;
  } catch {
    return null;
  }
}

export function platformFromUrl(rawUrl: string): string {
  const hostname = new URL(rawUrl).hostname.toLowerCase();
  if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) return "YouTube";
  if (hostname.includes("instagram.com")) return "Instagram";
  if (hostname.includes("x.com") || hostname.includes("twitter.com")) return "X";
  if (hostname.includes("facebook.com")) return "Facebook";
  if (hostname.includes("tiktok.com")) return "TikTok";
  if (hostname.includes("reddit.com")) return "Reddit";
  return "Generic";
}

export function buildDirectExtraction(id: string, sourceUrl: string): Extraction {
  return {
    id,
    title: "Direct Media",
    platform: platformFromUrl(sourceUrl),
    sourceUrl,
    duration: 0,
    uploader: "direct",
    formats: [
      {
        type: "video",
        ext: (new URL(sourceUrl).pathname.split(".").pop() || "mp4").toLowerCase(),
        label: "Direct",
        filesize: 0,
        hasAudio: true,
      },
    ],
  };
}

export function buildExtraction(id: string, sourceUrl: string, info: any): Extraction {
  const title = String(info?.title || "Untitled media");
  const formats = Array.isArray(info?.formats) ? info.formats : [];
  const normalized = formats.map((f: any, index: number) => ({
    type: f?.vcodec && !f?.acodec ? "video" : f?.acodec && !f?.vcodec ? "audio" : "media",
    label: f?.format_note || f?.format_id || `Format ${index + 1}`,
    ext: String(f?.ext || "mp4"),
    width: typeof f?.width === "number" ? f.width : undefined,
    height: typeof f?.height === "number" ? f.height : undefined,
    filesize: typeof f?.filesize === "number" ? f.filesize : undefined,
    hasAudio: Boolean(f?.acodec || f?.hasAudio),
    format_id: f?.format_id,
    url: f?.url,
  }));

  return {
    id,
    title,
    thumbnail: info?.thumbnail,
    duration: Number(info?.duration || 0),
    uploader: info?.uploader || info?.channel || "unknown",
    platform: platformFromUrl(sourceUrl),
    sourceUrl,
    formats: normalized,
  };
}

export async function saveInfoJson(id: string, info: any) {
  const infoDir = path.join(process.cwd(), ".data", "info");
  mkdirSync(infoDir, { recursive: true });
  const file = path.join(infoDir, `${id}.json`);
  writeFileSync(file, JSON.stringify(info, null, 2), "utf8");
  return file;
}

export async function runYtDlp(url: string, opts: { cookies?: string; proxy?: string } = {}) {
  return new Promise<any>((resolve, reject) => {
    const args = [
      "--dump-single-json",
      "--no-warnings",
      "--no-check-certificates",
      "--skip-download",
      "--flat-playlist",
    ];

    if (opts.cookies) args.push("--add-header", `Cookie:${opts.cookies}`);
    if (opts.proxy) args.push("--proxy", opts.proxy);

    args.push(url);

    const child = spawn("yt-dlp", args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        PATH: `${process.env.PATH || ""}${process.env.PATH ? ":" : ""}/usr/local/bin:/usr/bin`,
      },
    });

    let out = "";
    let err = "";

    child.stdout.on("data", (chunk) => {
      out += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      err += chunk.toString();
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(err || `yt-dlp exited with code ${code}`));
        return;
      }

      try {
        const parsed = JSON.parse(out);
        resolve(parsed);
      } catch {
        reject(new Error("Unable to parse yt-dlp output"));
      }
    });
  });
}

export async function fetchInvidiousExtraction(id: string, url: string): Promise<Extraction | null> {
  const u = new URL("https://invidious.projectsegfau.lt/api/v1/search?q=" + encodeURIComponent(url));
  const res = await fetch(u.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) return null;
  const json = await res.json();
  const item = Array.isArray(json) ? json[0] : null;
  if (!item) return null;
  return {
    id,
    title: item.title || "YouTube video",
    thumbnail: item.videoThumbnails?.[0]?.url,
    duration: Number(item.lengthSeconds || 0),
    uploader: item.author || "YouTube",
    platform: "YouTube",
    sourceUrl: url,
    formats: [
      {
        type: "video",
        ext: "mp4",
        label: "Fallback",
        filesize: 0,
        hasAudio: true,
      },
    ],
  };
}

export async function ensureSingleMediaFile(extraction: Extraction, formatIndex: number) {
  const format = extraction.formats[formatIndex];
  if (!format) throw new Error("Format not found");
  const baseDir = path.join(process.cwd(), ".data", "media");
  mkdirSync(baseDir, { recursive: true });
  const filePath = path.join(baseDir, `${extraction.id}-${formatIndex}.${format.ext || "bin"}`);
  if (!existsSync(filePath)) {
    const input = format.url || extraction.sourceUrl;
    const child = spawn("yt-dlp", ["-o", filePath, "--no-warnings", "--no-check-certificates", input], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, PATH: `${process.env.PATH || ""}${process.env.PATH ? ":" : ""}/usr/local/bin:/usr/bin` },
    });

    await new Promise<void>((resolve, reject) => {
      child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`download failed with code ${code}`))));
    });
  }

  return filePath;
}

export async function ensureMergedMediaFile(extraction: Extraction, formatIndex: number) {
  return ensureSingleMediaFile(extraction, formatIndex);
}

export function saveFormatFileName(extraction: Extraction, format: ExtractionFormat) {
  return safeDownloadName(extraction.title, format.ext || "bin");
}
