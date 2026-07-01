import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GenerateContentResult } from "@google/generative-ai";
import type { AnalyzeJob } from "@proptech/shared";
import { ZodError } from "zod";
import { createServiceClient } from "./lib/supabase.js";
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

export function resolveGeminiModels(): string[] {
  const fromEnv = process.env.GEMINI_MODEL?.trim();
  if (fromEnv) {
    return fromEnv.split(",").map((m) => m.trim()).filter(Boolean);
  }
  return DEFAULT_MODELS;
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
      "Ejecuta: node scripts/list-gemini-models.mjs"
    );
  }
  return msg.length > 400 ? `${msg.slice(0, 400)}…` : msg;
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
      console.warn(`[mcp-ai] Modelo ${modelName} falló:`, lastError.message);

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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    await markFailed(job.analysisId, "GEMINI_API_KEY no configurada");
    return;
  }

  const supabase = createServiceClient();
  const startedAt = Date.now();

  await supabase
    .from("document_analyses")
    .update({ status: "processing" })
    .eq("id", job.analysisId);

  try {
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(job.storagePath);

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

    const { error: updateError } = await supabase
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
      })
      .eq("id", job.analysisId);

    if (updateError) {
      throw new Error(`Error al guardar resultado: ${updateError.message}`);
    }
  } catch (err) {
    await markFailed(
      job.analysisId,
      friendlyError(err),
      Date.now() - startedAt,
    );
  }
}

async function markFailed(
  analysisId: string,
  message: string,
  durationMs?: number,
): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("document_analyses")
    .update({
      status: "failed",
      error_message: message,
      duration_ms: durationMs ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq("id", analysisId);
}
