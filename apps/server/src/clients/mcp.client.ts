import type { AnalyzeJob } from "@proptech/shared";
import { createUserClient } from "../lib/supabase.js";
import { serverConfig } from "../lib/config.js";
import { publishAnalysisJob } from "./pubsub.client.js";

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

// Pub/Sub: espera a la publicación para que el 202 salga cuando el job ya está en la cola.
// HTTP (por defecto): envío en segundo plano, como antes.
export async function dispatchAnalysisJob(
  job: AnalyzeJob,
  accessToken: string,
  requestId: string,
): Promise<void> {
  if (serverConfig.analysisTransport === "pubsub") {
    try {
      await publishAnalysisJob(job, requestId);
    } catch {
      console.error(`[mcp] Encolado en Pub/Sub falló — análisis ${job.analysisId}`);
      await markEnqueueFailed(
        job.analysisId,
        "Error al publicar el análisis en la cola",
        accessToken,
      );
    }
    return;
  }
  void dispatchAnalysisJobAsync(job, accessToken, requestId);
}

async function dispatchAnalysisJobAsync(
  job: AnalyzeJob,
  accessToken: string,
  requestId: string,
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
    "X-Request-ID": requestId,
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
