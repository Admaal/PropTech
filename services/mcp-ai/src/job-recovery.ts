import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const ClaimedAnalysisJobRowSchema = z.object({
  analysis_id: z.string().uuid(),
  document_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  storage_path: z.string().min(1),
  attempt_count: z.number().int().positive(),
});

export interface ClaimedAnalysisJob {
  analysisId: string;
  documentId: string;
  organizationId: string;
  storagePath: string;
  attemptCount: number;
}

export async function claimAnalysisJob(
  supabase: SupabaseClient,
  analysisId: string,
): Promise<ClaimedAnalysisJob | null> {
  const { data, error } = await supabase.rpc("claim_analysis_job", {
    p_analysis_id: analysisId,
    p_lease_seconds: 300,
  });

  if (error) {
    throw new Error(`No se pudo reclamar el análisis: ${error.message}`);
  }

  const raw = Array.isArray(data) ? data[0] : data;
  if (!raw) return null;

  const row = ClaimedAnalysisJobRowSchema.parse(raw);
  return {
    analysisId: row.analysis_id,
    documentId: row.document_id,
    organizationId: row.organization_id,
    storagePath: row.storage_path,
    attemptCount: row.attempt_count,
  };
}

export function calculateRetryDelaySeconds(attemptCount: number): number {
  const normalizedAttempt = Math.max(1, Math.floor(attemptCount));
  return Math.min(900, 30 * 2 ** (normalizedAttempt - 1));
}

export function startLeaseHeartbeat(
  supabase: SupabaseClient,
  analysisId: string,
): () => void {
  const timer = setInterval(() => {
    void renewLease(supabase, analysisId);
  }, 30_000);

  return () => clearInterval(timer);
}

async function renewLease(
  supabase: SupabaseClient,
  analysisId: string,
): Promise<void> {
  try {
    await supabase.rpc("renew_analysis_job", {
      p_analysis_id: analysisId,
      p_lease_seconds: 300,
    });
  } catch {
    // La siguiente reconciliación decidirá si el lease sigue siendo válido.
  }
}

export async function markAnalysisFailed(
  supabase: SupabaseClient,
  analysisId: string,
  message: string,
  attemptCount: number,
  durationMs?: number,
): Promise<void> {
  const nextRetryAt =
    attemptCount < 3
      ? new Date(
          Date.now() + calculateRetryDelaySeconds(attemptCount) * 1000,
        ).toISOString()
      : null;

  const { error } = await supabase
    .from("document_analyses")
    .update({
      status: "failed",
      error_message: message,
      duration_ms: durationMs ?? null,
      completed_at: new Date().toISOString(),
      lease_until: null,
      next_retry_at: nextRetryAt,
    })
    .eq("id", analysisId)
    .eq("status", "processing")
    .eq("attempt_count", attemptCount);

  if (error) {
    throw new Error(`No se pudo marcar el análisis como fallido: ${error.message}`);
  }
}
