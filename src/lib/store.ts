import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import path from "node:path";

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
  try {
    mkdirSync(storeRoot, { recursive: true });
    for (const entry of readdirSync(storeRoot, { withFileTypes: true })) {
      const full = path.join(storeRoot, entry.name);
      if (entry.isFile() && entry.name.endsWith(".json")) {
        unlinkSync(full);
      }
    }
  } catch {
    // ignore cleanup errors; fallback will recreate as needed
  }
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
    const raw = readFileSync(file, "utf8");
    return JSON.parse(raw) as Extraction;
  } catch {
    return null;
  }
}
