import { AnalysisResultSchema, type AnalysisResult } from "@proptech/shared";

/** Parsea y valida el JSON devuelto por Gemini antes de persistir. */
export function parseGeminiAnalysisJson(rawText: string): AnalysisResult {
  return AnalysisResultSchema.parse(JSON.parse(rawText));
}
