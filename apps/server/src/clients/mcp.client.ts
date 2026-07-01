import type { AnalyzeJob } from "@proptech/shared";
import { createUserClient } from "../lib/supabase.js";

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

async function markEnqueueFailed(
  analysisId: string,
  message: string,
  accessToken: string,
): Promise<void> {
  try {
    const supabase = createUserClient(accessToken);
    await supabase
      .from("document_analyses")
      .update({
        status: "failed",
        error_message: message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", analysisId)
      .in("status", ["pending", "processing"]);
  } catch (err) {
    console.error(`[mcp] No se pudo marcar failed ${analysisId}:`, err);
  }
}

export function dispatchAnalysisJob(job: AnalyzeJob, accessToken: string): void {
  void dispatchAnalysisJobAsync(job, accessToken);
}

async function dispatchAnalysisJobAsync(
  job: AnalyzeJob,
  accessToken: string,
): Promise<void> {
  const baseUrl = (process.env.MCP_SERVER_URL ?? "http://localhost:3002").replace(
    /\/$/,
    "",
  );
  const internalKey = process.env.INTERNAL_SERVICE_KEY?.trim();
  if (!internalKey) {
    const msg = "INTERNAL_SERVICE_KEY no configurada en el server";
    console.error(`[mcp] ${msg} — análisis ${job.analysisId}`);
    await markEnqueueFailed(job.analysisId, msg, accessToken);
    return;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Internal-Key": internalKey,
  };

  const idToken = await getCloudRunIdToken(baseUrl);
  if (baseUrl.includes(".run.app") && !idToken) {
    const msg = "No se pudo obtener token de identidad para mcp-ai";
    console.error(`[mcp] ${msg} — análisis ${job.analysisId}`);
    await markEnqueueFailed(job.analysisId, msg, accessToken);
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
      const msg = `Encolado falló: HTTP ${res.status}${body ? ` — ${body.slice(0, 120)}` : ""}`;
      console.error(`[mcp] ${msg} (${job.analysisId})`);
      await markEnqueueFailed(job.analysisId, msg, accessToken);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[mcp] Error al encolar análisis ${job.analysisId}:`, msg);
    await markEnqueueFailed(job.analysisId, `Error de red al encolar: ${msg}`, accessToken);
  }
}
