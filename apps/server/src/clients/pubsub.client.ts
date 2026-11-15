import type { AnalyzeJob } from "@proptech/shared";
import { z } from "zod";
import { serverConfig } from "../lib/config.js";

const METADATA_TOKEN_URL =
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";

// La respuesta del servidor de metadatos es externa: se valida antes de usarla.
const MetadataTokenSchema = z.object({ access_token: z.string().min(1) });

async function getServiceAccessToken(): Promise<string> {
  const res = await fetch(METADATA_TOKEN_URL, {
    headers: { "Metadata-Flavor": "Google" },
  });
  if (!res.ok) {
    throw new Error(`Token de servicio no disponible (HTTP ${res.status})`);
  }
  return MetadataTokenSchema.parse(await res.json()).access_token;
}

// Publica el job en el topic. El requestId viaja como atributo para correlación (PR 4).
export async function publishAnalysisJob(
  job: AnalyzeJob,
  requestId: string,
): Promise<void> {
  const projectId = serverConfig.gcpProjectId;
  if (!projectId) {
    throw new Error("GCP_PROJECT_ID no configurado para publicar en Pub/Sub");
  }

  const token = await getServiceAccessToken();
  const url = `https://pubsub.googleapis.com/v1/projects/${projectId}/topics/${serverConfig.analysisTopic}:publish`;
  const data = Buffer.from(JSON.stringify(job), "utf8").toString("base64");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages: [{ data, attributes: { requestId } }] }),
  });
  if (!res.ok) {
    throw new Error(`Publicación en Pub/Sub rechazada (HTTP ${res.status})`);
  }
}
