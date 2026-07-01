import path from "node:path";

const MAX_FILENAME_LENGTH = 200;
const FALLBACK_FILENAME = "document.pdf";

export function sanitizeFilename(original: string): string {
  const base = path.basename(original.replace(/\\/g, "/"));
  const cleaned = base
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^\.+/, "")
    .slice(0, MAX_FILENAME_LENGTH)
    .trim();

  if (!cleaned || cleaned === "." || cleaned === "..") {
    return FALLBACK_FILENAME;
  }

  return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
}
