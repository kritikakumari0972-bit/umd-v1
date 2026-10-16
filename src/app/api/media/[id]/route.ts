import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { existsSync, statSync, createReadStream } from "node:fs";
import { getExtraction, cleanupStore, type Extraction } from "@/lib/store";
import {
  ensureMergedMediaFile,
  ensureSingleMediaFile,
  runYtDlp,
  buildExtraction,
  saveInfoJson,
} from "@/lib/yt-dlp";
import { contentDisposition, safeDownloadName } from "@/lib/filename";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function mimeForExt(ext: string): string {
  const e = ext.toLowerCase();
  const map: Record<string, string> = {
    mp4: "video/mp4",
    webm: "video/webm",
    mkv: "video/x-matroska",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    wav: "audio/wav",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
  };
  return map[e] || "application/octet-stream";
}

function cookieHeader(raw?: string) {
  if (!raw) return undefined;
  const attrs = new Set(["domain", "path", "secure", "expires", "httponly", "samesite", "max-age", "partitioned"]);
  const pairs: string[] = [];
  for (const part of String(raw).split(";")) {
    const p = part.trim();
    if (!p) continue;
    const eq = p.indexOf("=");
    if (eq === -1) continue;
    const name = p.slice(0, eq).trim().toLowerCase();
    if (attrs.has(name)) continue;
    pairs.push(p);
  }
  return pairs.length ? pairs.join("; ") : undefined;
}

function serveLocalFile(filePath: string, filename: string, ext: string, download: boolean, req: Request): Response {
  const stat = statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.get("range");

  if (range && !download) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (isNaN(start) || start >= fileSize || end >= fileSize) {
      return new Response("Range Not Satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${fileSize}` },
      });
    }

    const chunkSize = end - start + 1;
    const stream = createReadStream(filePath, { start, end });
    const headers = new Headers();
    headers.set("Content-Range", `bytes ${start}-${end}/${fileSize}`);
    headers.set("Accept-Ranges", "bytes");
    headers.set("Content-Length", String(chunkSize));
    headers.set("Content-Type", mimeForExt(ext));
    headers.set("Content-Disposition", "inline");
    headers.set("Cache-Control", "private, max-age=3600");

    return new Response(Readable.toWeb(stream) as unknown as ReadableStream, {
      status: 206,
      headers,
    });
  }

  const stream = createReadStream(filePath);
  const headers = new Headers();
  headers.set("Content-Length", String(fileSize));
  headers.set("Accept-Ranges", "bytes");

  if (download) {
    headers.set("Content-Type", "application/octet-stream");
    headers.set("Content-Disposition", contentDisposition(filename));
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Download-Filename", encodeURIComponent(filename));
  } else {
    headers.set("Content-Type", mimeForExt(ext));
    headers.set("Content-Disposition", "inline");
  }

  return new Response(Readable.toWeb(stream) as unknown as ReadableStream, { headers });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const formatIndex = Number(url.searchParams.get("format") ?? "0");
  const download = url.searchParams.get("download") === "1";

  const extraction = getExtraction(id);
  if (!extraction) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const format = extraction.formats[formatIndex];
    if (!format) {
      return NextResponse.json({ error: "Format not found" }, { status: 404 });
    }

    const filePath = await ensureSingleMediaFile(extraction, formatIndex);
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: "Media file not found" }, { status: 404 });
    }

    return serveLocalFile(filePath, safeDownloadName(extraction.title, format.ext), format.ext, download, req);
  } catch (error: any) {
    const msg = error?.message || "Media unavailable";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
