const PDF_MAGIC = "%PDF-";

export function isPdfBuffer(buffer: Buffer): boolean {
  if (buffer.length < 5) return false;
  return buffer.subarray(0, 5).toString("ascii") === PDF_MAGIC;
}

export function isAnalysisQuotaExceeded(
  countToday: number,
  dailyQuota: number,
): boolean {
  return dailyQuota > 0 && countToday >= dailyQuota;
}
