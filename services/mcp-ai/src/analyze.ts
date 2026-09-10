import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GenerateContentResult } from "@google/generative-ai";
import type { AnalyzeJob } from "@proptech/shared";
import { z, ZodError } from "zod";
import { createServiceClient } from "./lib/supabase.js";
import {
  claimAnalysisJob,
  markAnalysisFailed,
  startLeaseHeartbeat,
} from "./job-recovery.js";
import { parseGeminiAnalysisJson } from "./parse-analysis-response.js";

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

// Ver modelos vigentes: node scripts/list-gemini-models.mjs
const DEFAULT_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-2.5-flash-lite",
];

const RecoverableAnalysisRowsSchema = z.array(
  z.object({
    id: z.string().uuid(),
    document_id: z.string().uuid(),
    organization_id: z.string().uuid(),
    documents: z.union([
      z.object({ storage_path: z.string().min(1) }),
      z.array(z.object({ storage_path: z.string().min(1) })),
      z.null(),
    ]),
  }),
);

export function resolveGeminiModels(): string[] {
  const fromEnv = process.env.GEMINI_MODEL?.trim();
  if (fromEnv) {
    return fromEnv.split(",").map((m) => m.trim()).filter(Boolean);
  }
  return DEFAULT_MODELS;
}

export async function reconcileAnalysisJobs(): Promise<void> {
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

    void runAnalysis({
      analysisId: row.id,
      documentId: row.document_id,
      organizationId: row.organization_id,
      storagePath: document.storage_path,
    });
  }
}

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("429") || msg.toLowerCase().includes("quota");
}

function isModelUnavailableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("404") ||
    msg.toLowerCase().includes("is not found") ||
    msg.toLowerCase().includes("not supported for generatecontent")
  );
}

function parseRetrySeconds(err: unknown): number {
  const msg = err instanceof Error ? err.message : String(err);
  const match = msg.match(/retry in (\d+(?:\.\d+)?)s/i);
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
  apiKey: string,
  base64: string,
): Promise<GenerateContentResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const models = resolveGeminiModels();
  let lastError: Error | null = null;

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      return await model.generateContent([
        { text: buildSystemPrompt() },
        {
          inlineData: {
            mimeType: "application/pdf",
            data: base64,
          },
        },
      ]);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[mcp-ai] Modelo ${modelName} falló`);

      if (isQuotaError(err)) {
        const wait = parseRetrySeconds(err);
        console.warn(`[mcp-ai] Cuota 429 — esperando ${wait}s antes del siguiente modelo…`);
        await sleep(Math.min(wait, 60));
        continue;
      }
      if (isModelUnavailableError(err)) {
        console.warn(`[mcp-ai] Modelo ${modelName} no disponible — probando siguiente…`);
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error("Ningún modelo Gemini disponible");
}

export async function runAnalysis(job: AnalyzeJob): Promise<void> {
  const supabase = createServiceClient();
  let claimed;
  try {
    claimed = await claimAnalysisJob(supabase, job.analysisId);
  } catch {
    console.error(`[mcp-ai] No se pudo reclamar el job ${job.analysisId}`);
    return;
  }
  if (!claimed) {
    return;
  }

  const startedAt = Date.now();
  const stopHeartbeat = startLeaseHeartbeat(supabase, claimed.analysisId);
  const apiKey = process.env.GEMINI_API_KEY;

  try {
    if (!apiKey) {
      await markAnalysisFailed(
        supabase,
        claimed.analysisId,
        "GEMINI_API_KEY no configurada",
        claimed.attemptCount,
      );
      return;
    }

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

    const result = await generateWithModels(apiKey, base64);

    const rawText = result.response.text();
    const parsed = parseGeminiAnalysisJson(rawText);
    const durationMs = Date.now() - startedAt;
    const tokensUsed =
      result.response.usageMetadata?.totalTokenCount ?? null;

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
  } catch (err) {
    try {
      await markAnalysisFailed(
        supabase,
        job.analysisId,
        friendlyError(err),
        claimed.attemptCount,
        Date.now() - startedAt,
      );
    } catch {
      console.error(`[mcp-ai] No se pudo marcar fallido ${job.analysisId}`);
    }
  } finally {
    stopHeartbeat();
  }
}
