import { timingSafeEqual } from "node:crypto";

export function isValidInternalKey(
  provided: string | string[] | undefined,
  expected: string,
): boolean {
  if (typeof provided !== "string") return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
