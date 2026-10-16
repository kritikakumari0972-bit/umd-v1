export function safeDownloadName(title: string, ext: string) {
  const base = title
    .trim()
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\.$/, "")
    .slice(0, 140)
    .trim();

  return `${base || "download"}.${ext}`.replace(/\.+(?=\.[^.]+$)/g, "");
}

export function contentDisposition(filename: string, inline = false) {
  const encoded = encodeURIComponent(filename).replace(/\(/g, "%28").replace(/\)/g, "%29");
  return `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encoded}`;
}
