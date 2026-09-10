import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DocumentAnalysis,
  DocumentAnalysisWithFilename,
  ExtractedData,
  LatestAnalysisSummary,
} from "@proptech/shared";
import {
  DocumentAnalysisSchema,
  DocumentAnalysisWithFilenameSchema,
} from "@proptech/shared";

interface AnalysisRow {
  id: string;
  document_id: string;
  organization_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  risk_level: "low" | "medium" | "high" | null;
  solvency_score: number | null;
  extracted_data: ExtractedData | null;
  report_markdown: string | null;
  tokens_used: number | null;
  duration_ms: number | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  documents?: { filename: string; property_id: string | null } | null;
}

function docFromRow(
  documents: AnalysisRow["documents"],
): { filename: string; property_id: string | null } | null {
  if (!documents) return null;
  return Array.isArray(documents) ? (documents[0] ?? null) : documents;
}

function mapRow(row: AnalysisRow): DocumentAnalysis {
  return DocumentAnalysisSchema.parse({
    id: row.id,
    document_id: row.document_id,
    organization_id: row.organization_id,
    status: row.status,
    risk_level: row.risk_level,
    solvency_score: row.solvency_score,
    extracted_data: row.extracted_data,
    report_markdown: row.report_markdown,
    tokens_used: row.tokens_used,
    duration_ms: row.duration_ms,
    error_message: row.error_message,
    created_at: row.created_at,
    completed_at: row.completed_at,
  });
}

function mapRowWithFilename(row: AnalysisRow): DocumentAnalysisWithFilename {
  const doc = docFromRow(row.documents);
  return DocumentAnalysisWithFilenameSchema.parse({
    ...mapRow(row),
    filename: doc?.filename ?? null,
    property_id: doc?.property_id ?? null,
  });
}

interface LatestAnalysisRow {
  id: string;
  risk_level: "low" | "medium" | "high" | null;
  solvency_score: number | null;
  completed_at: string | null;
  documents: { property_id: string | null } | { property_id: string | null }[];
}

export class AnalysisRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(id: string): Promise<DocumentAnalysis | null> {
    const { data, error } = await this.supabase
      .from("document_analyses")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Error al consultar análisis: ${error.message}`);
    }

    return data ? mapRow(data as AnalysisRow) : null;
  }

  async findRecent(limit = 20): Promise<DocumentAnalysisWithFilename[]> {
    const { data, error } = await this.supabase
      .from("document_analyses")
      .select("*, documents(filename, property_id)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Error al listar análisis: ${error.message}`);
    }

    return (data as AnalysisRow[]).map(mapRowWithFilename);
  }

  async findByPropertyId(
    propertyId: string,
    limit = 20,
  ): Promise<DocumentAnalysisWithFilename[]> {
    const { data, error } = await this.supabase
      .from("document_analyses")
      .select("*, documents!inner(filename, property_id)")
      .eq("documents.property_id", propertyId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(
        `Error al listar análisis de la propiedad: ${error.message}`,
      );
    }

    return (data as AnalysisRow[]).map(mapRowWithFilename);
  }

  async countCreatedToday(organizationId: string): Promise<number> {
    const startOfDayUtc = new Date();
    startOfDayUtc.setUTCHours(0, 0, 0, 0);

    const { count, error } = await this.supabase
      .from("document_analyses")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("created_at", startOfDayUtc.toISOString());

    if (error) {
      throw new Error(
        `Error al consultar cuota de análisis: ${error.message}`,
      );
    }

    return count ?? 0;
  }

  async findLatestCompletedByPropertyIds(
    propertyIds: string[],
  ): Promise<Record<string, LatestAnalysisSummary>> {
    if (propertyIds.length === 0) return {};

    const { data, error } = await this.supabase
      .from("document_analyses")
      .select(
        "id, risk_level, solvency_score, completed_at, documents!inner(property_id)",
      )
      .eq("status", "completed")
      .order("completed_at", { ascending: false });

    if (error) {
      throw new Error(
        `Error al consultar últimas evaluaciones: ${error.message}`,
      );
    }

    const allowed = new Set(propertyIds);
    const result: Record<string, LatestAnalysisSummary> = {};

    for (const row of (data ?? []) as LatestAnalysisRow[]) {
      const doc = row.documents;
      const propertyId = Array.isArray(doc) ? doc[0]?.property_id : doc?.property_id;
      if (!propertyId || !allowed.has(propertyId) || result[propertyId]) {
        continue;
      }
      result[propertyId] = {
        id: row.id,
        risk_level: row.risk_level,
        solvency_score: row.solvency_score,
        completed_at: row.completed_at,
      };
    }

    return result;
  }
}
