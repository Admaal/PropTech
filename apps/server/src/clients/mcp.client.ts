import type { AnalyzeJob } from "@proptech/shared";

export function dispatchAnalysisJob(job: AnalyzeJob): void {
  const baseUrl = process.env.MCP_SERVER_URL ?? "http://localhost:3002";
  const internalKey = process.env.INTERNAL_SERVICE_KEY ?? "dev-internal-key";

  fetch(`${baseUrl}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Key": internalKey,
    },
    body: JSON.stringify(job),
  }).catch((err: unknown) => {
    console.error(
      `[mcp] Error al encolar análisis ${job.analysisId}:`,
      err instanceof Error ? err.message : err,
    );
  });
}
