import type { AnalyzeJob } from "@proptech/shared";
import { createUserClient } from "../lib/supabase.js";
import { serverConfig } from "../lib/config.js";

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
  } catch {
    console.error(`[mcp] No se pudo marcar failed ${analysisId}`);
  }
}

export function dispatchAnalysisJob(job: AnalyzeJob, accessToken: string): void {
  void dispatchAnalysisJobAsync(job, accessToken);
}

async function dispatchAnalysisJobAsync(
  job: AnalyzeJob,
  accessToken: string,
): Promise<void> {
  const baseUrl = serverConfig.mcpServerUrl.replace(/\/$/, "");
  const internalKey = serverConfig.internalServiceKey;
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
      const msg = `Encolado falló: HTTP ${res.status}`;
      console.error(`[mcp] ${msg} (${job.analysisId})`);
      await markEnqueueFailed(job.analysisId, msg, accessToken);
    }
  } catch {
    console.error(`[mcp] Error de red al encolar análisis ${job.analysisId}`);
    await markEnqueueFailed(
      job.analysisId,
      "Error de red al encolar el análisis",
      accessToken,
    );
  }
}
