function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : fallback;
}

export const serverConfig = {
  dailyAnalysisQuota: readInt("DAILY_ANALYSIS_QUOTA", 0),
  rateLimitWindowMs: readInt("RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
  rateLimitMax: readInt("RATE_LIMIT_MAX", 100),
  uploadRateLimitMax: readInt("UPLOAD_RATE_LIMIT_MAX", 5),
} as const;
