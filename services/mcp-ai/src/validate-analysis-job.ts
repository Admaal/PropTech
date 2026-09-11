import type { AnalyzeJob } from "@proptech/shared";
import type { SupabaseClient } from "@supabase/supabase-js";

interface AnalysisRow {
  id: string;
  document_id: string;
  organization_id: string;
  status: string;
}

interface DocumentRow {
  id: string;
  organization_id: string;
  storage_path: string;
}

/** Compara job encolado con filas DB; null = válido, string = motivo de rechazo. */
export function assertJobMatchesRecords(
  job: AnalyzeJob,
  analysis: AnalysisRow,
  document: DocumentRow,
): string | null {
  if (analysis.id !== job.analysisId) return "analysisId no coincide";
  if (analysis.document_id !== job.documentId) return "documentId no coincide";
  if (analysis.organization_id !== job.organizationId) {
    return "organizationId no coincide";
  }
  if (analysis.status !== "pending") {
    return `Estado inválido: ${analysis.status}`;
  }
  if (document.id !== job.documentId) return "documento id no coincide";
  if (document.organization_id !== job.organizationId) {
    return "documento no pertenece a la organización";
  }
  if (document.storage_path !== job.storagePath) {
    return "storagePath no coincide";
  }
  return null;
}

export async function validateAnalysisJob(
  supabase: SupabaseClient,
  job: AnalyzeJob,
): Promise<string | null> {
  const { data: analysis, error: analysisError } = await supabase
    .from("document_analyses")
    .select("id, document_id, organization_id, status")
    .eq("id", job.analysisId)
    .maybeSingle();

  if (analysisError || !analysis) return "Análisis no encontrado";

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id, organization_id, storage_path")
    .eq("id", job.documentId)
    .maybeSingle();

  if (documentError || !document) return "Documento no encontrado";

  return assertJobMatchesRecords(
    job,
    analysis as AnalysisRow,
    document as DocumentRow,
  );
}
