import type { AnalyzeJob } from "@proptech/shared";

async function getCloudRunIdToken(audience: string): Promise<string | undefined> {
  if (!audience.includes(".run.app")) {
    return undefined;
  }

  try {
    const res = await fetch(
      `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(audience)}`,
      { headers: { "Metadata-Flavor": "Google" } },
    );
    if (!res.ok) {
      return undefined;
    }
    return res.text();
  } catch {
    return undefined;
  }
}

export function dispatchAnalysisJob(job: AnalyzeJob): void {
  void dispatchAnalysisJobAsync(job);
}

async function dispatchAnalysisJobAsync(job: AnalyzeJob): Promise<void> {
  const baseUrl = (process.env.MCP_SERVER_URL ?? "http://localhost:3002").replace(
    /\/$/,
    "",
  );
  const internalKey = process.env.INTERNAL_SERVICE_KEY ?? "dev-internal-key";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Internal-Key": internalKey,
  };

  const idToken = await getCloudRunIdToken(baseUrl);
  if (baseUrl.includes(".run.app") && !idToken) {
    console.error(
      `[mcp] Sin token de identidad para ${baseUrl} — análisis ${job.analysisId} no encolado`,
    );
    return;
  }
  if (idToken) {
    headers.Authorization = `Bearer ${idToken}`;
  }

  try {
    const res = await fetch(`${baseUrl}/analyze`, {
      method: "POST",
      headers,
      body: JSON.stringify(job),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        `[mcp] Encolado falló ${job.analysisId}: HTTP ${res.status} ${body.slice(0, 200)}`,
      );
    }
  } catch (err: unknown) {
    console.error(
      `[mcp] Error al encolar análisis ${job.analysisId}:`,
      err instanceof Error ? err.message : err,
    );
  }
}
