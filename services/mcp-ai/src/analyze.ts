import { GoogleGenAI } from "@google/genai";
import type { GenerateContentResponse } from "@google/genai";
import type { AnalyzeJob } from "@proptech/shared";
import { z, ZodError } from "zod";
import { createServiceClient } from "./lib/supabase.js";
import {
  claimAnalysisJob,
  markAnalysisFailed,
  startLeaseHeartbeat,
} from "./job-recovery.js";
import { parseGeminiAnalysisJson } from "./parse-analysis-response.js";
import { logEvent, type LogFields } from "./logger.js";
import { newRequestId } from "./request-id.js";
import type { AnalysisOutcome } from "./pubsub-push.js";

function buildSystemPrompt(): string {
  const now = new Date();
  const analysisDate = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    dateStyle: "long",
  }).format(now);
  const currentMonthYear = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    month: "long",
    year: "numeric",
  }).format(now);

  return `Eres un analista de riesgo financiero inmobiliario en España.

Contexto temporal (úsalo siempre al evaluar fechas del documento):
- Fecha de análisis: ${analysisDate} (zona horaria Europe/Madrid)
- Mes y año actuales: ${currentMonthYear}
- Una nómina o recibo del mes en curso o de meses anteriores es NORMAL, no es "fecha futura".
- Solo marca como anomalía de fecha si el documento es claramente posterior a la fecha de análisis.
- Documentos de los últimos 3 meses no deben penalizarse por antigüedad.

Analiza el documento PDF (nómina, contrato de alquiler o informe de solvencia) y responde ÚNICAMENTE con un JSON válido sin markdown, con esta estructura exacta:
{
  "solvency_score": <número 0-100>,
  "risk_level": "low" | "medium" | "high",
  "extracted_data": {
    "monthly_income": <número en euros si consta, si no omite la clave>,
    "employer": <string si consta, si no omite la clave>,
    "contract_type": <string si consta, si no omite la clave>,
    "anomalies": [<strings con anomalías detectadas>]
  },
  "report_markdown": "<informe breve en español, 2-4 párrafos, justificando el nivel de riesgo>"
}
Criterios: low = ingresos estables y suficientes; medium = dudas o datos incompletos; high = riesgo claro de impago o inconsistencias graves.
Si el documento no es legible, risk_level "high" y explica en anomalies.`;
}

// Modelos y clave llegan validados desde parseMcpConfig (runtime-config.ts).
export interface GeminiSettings {
  apiKey: string;
  models: string[];
}

const RecoverableAnalysisRowsSchema = z.array(
  z.object({
    id: z.guid(),
    document_id: z.guid(),
    organization_id: z.guid(),
    documents: z.union([
      z.object({ storage_path: z.string().min(1) }),
      z.array(z.object({ storage_path: z.string().min(1) })),
      z.null(),
    ]),
  }),
);

export async function reconcileAnalysisJobs(
  gemini: GeminiSettings,
): Promise<void> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("document_analyses")
    .select("id, document_id, organization_id, documents(storage_path)")
    .in("status", ["pending", "processing", "failed"])
    .order("created_at", { ascending: true })
    .limit(20);

  if (error) {
    console.error("[mcp-ai] No se pudieron reconciliar jobs IA");
    return;
  }

  let rows: z.infer<typeof RecoverableAnalysisRowsSchema>;
  try {
    rows = RecoverableAnalysisRowsSchema.parse(data ?? []);
  } catch {
    console.error("[mcp-ai] Respuesta inválida al reconciliar jobs IA");
    return;
  }

  for (const row of rows) {
    const document = Array.isArray(row.documents)
      ? row.documents[0]
      : row.documents;
    if (!document) continue;

    void runAnalysis(
      {
        analysisId: row.id,
        documentId: row.document_id,
        organizationId: row.organization_id,
        storagePath: document.storage_path,
      },
      newRequestId(),
      gemini,
    );
  }
}

function errorStatus(err: unknown): number | undefined {
  const status = (err as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : undefined;
}

function isQuotaError(err: unknown): boolean {
  if (errorStatus(err) === 429) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("429") || msg.toLowerCase().includes("quota");
}

function isModelUnavailableError(err: unknown): boolean {
  if (errorStatus(err) === 404) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("404") ||
    msg.toLowerCase().includes("is not found") ||
    msg.toLowerCase().includes("not supported for generatecontent")
  );
}

function parseRetrySeconds(err: unknown): number {
  const msg = err instanceof Error ? err.message : String(err);
  const match = msg.match(/retry(?: in |Delay"?\s*:\s*")(\d+(?:\.\d+)?)s/i);
  return match ? Math.ceil(Number(match[1])) + 1 : 50;
}

function friendlyError(err: unknown): string {
  if (err instanceof ZodError) {
    const summary = err.issues
      .slice(0, 3)
      .map((i) => `${i.path.join(".") || "raíz"}: ${i.message}`)
      .join("; ");
    return `Respuesta IA inválida (${summary})`;
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (isQuotaError(err)) {
    return (
      "Cuota gratuita de Gemini agotada. Espera ~1 minuto y reintenta, " +
      "o define GEMINI_MODEL=gemini-3.1-flash-lite,gemini-2.5-flash-lite en .env"
    );
  }
  if (isModelUnavailableError(err)) {
    return (
      "Modelo Gemini no disponible (retirado o nombre incorrecto). " +
      "Define GEMINI_MODEL en .env con modelos vigentes de Google AI Studio."
    );
  }
  if (msg.includes("No se pudo descargar")) {
    return "No se pudo descargar el documento para analizarlo";
  }
  return "Error inesperado al procesar el documento con IA";
}

async function sleep(seconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

async function generateWithModels(
  { apiKey, models }: GeminiSettings,
  base64: string,
  ctx: LogFields,
): Promise<GenerateContentResponse> {
  const ai = new GoogleGenAI({ apiKey });
  let lastError: Error | null = null;

  for (const modelName of models) {
    try {
      return await ai.models.generateContent({
        model: modelName,
        contents: [
          { text: buildSystemPrompt() },
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64,
            },
          },
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      logEvent("warn", "modelo falló", { ...ctx, model: modelName });

      if (isQuotaError(err)) {
        const wait = parseRetrySeconds(err);
        logEvent("warn", `cuota 429, esperando ${wait}s antes del siguiente modelo`, {
          ...ctx,
          model: modelName,
          status: 429,
        });
        await sleep(Math.min(wait, 60));
        continue;
      }
      if (isModelUnavailableError(err)) {
        logEvent("warn", "modelo no disponible, probando el siguiente", {
          ...ctx,
          model: modelName,
        });
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error("Ningún modelo Gemini disponible");
}

export async function runAnalysis(
  job: AnalyzeJob,
  requestId: string,
  gemini: GeminiSettings,
): Promise<AnalysisOutcome> {
  const ctx: LogFields = {
    service: "mcp-ai",
    requestId,
    analysisId: job.analysisId,
  };
  const supabase = createServiceClient();
  let claimed;
  try {
    claimed = await claimAnalysisJob(supabase, job.analysisId);
  } catch {
    logEvent("error", "no se pudo reclamar el job", ctx);
    return "transient";
  }
  if (!claimed) {
    return "skipped";
  }
  logEvent("info", "análisis iniciado", { ...ctx, attempt: claimed.attemptCount });

  const startedAt = Date.now();
  const stopHeartbeat = startLeaseHeartbeat(supabase, claimed.analysisId);

  try {
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(claimed.storagePath);

    if (downloadError || !fileData) {
      throw new Error(
        `No se pudo descargar el PDF: ${downloadError?.message ?? "sin datos"}`,
      );
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const base64 = buffer.toString("base64");

    const result = await generateWithModels(gemini, base64, ctx);

    const rawText = result.text ?? "";
    const parsed = parseGeminiAnalysisJson(rawText);
    const durationMs = Date.now() - startedAt;
    const tokensUsed =
      result.usageMetadata?.totalTokenCount ?? null;

    const { data: updatedAnalysis, error: updateError } = await supabase
      .from("document_analyses")
      .update({
        status: "completed",
        risk_level: parsed.risk_level,
        solvency_score: parsed.solvency_score,
        extracted_data: parsed.extracted_data,
        report_markdown: parsed.report_markdown,
        tokens_used: tokensUsed,
        duration_ms: durationMs,
        completed_at: new Date().toISOString(),
        error_message: null,
        lease_until: null,
        next_retry_at: null,
      })
      .eq("id", claimed.analysisId)
      .eq("status", "processing")
      .eq("attempt_count", claimed.attemptCount)
      .select("id")
      .maybeSingle();

    if (updateError) {
      throw new Error(`Error al guardar resultado: ${updateError.message}`);
    }
    if (!updatedAnalysis) {
      throw new Error("El lease del análisis ya no pertenece a este worker");
    }
    return "completed";
  } catch (err) {
    try {
      await markAnalysisFailed(
        supabase,
        job.analysisId,
        friendlyError(err),
        claimed.attemptCount,
        Date.now() - startedAt,
      );
      return "failed";
    } catch {
      logEvent("error", "no se pudo marcar el análisis como fallido", ctx);
      return "transient";
    }
  } finally {
    stopHeartbeat();
  }
}
