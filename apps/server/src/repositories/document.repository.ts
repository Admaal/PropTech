import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DocumentSchema,
  UploadDocumentResponseSchema,
  type Document,
  type UploadDocumentResponse,
} from "@proptech/shared";
import { randomUUID } from "node:crypto";

function mapRow(row: unknown): Document {
  return DocumentSchema.parse(row);
}

export class DocumentRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findExistingUpload(
    organizationId: string,
    idempotencyKey: string,
  ): Promise<UploadDocumentResponse | null> {
    const { data, error } = await this.supabase
      .from("documents")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (error) {
      throw new Error(`Error al consultar idempotencia: ${error.message}`);
    }
    if (!data) return null;

    const { data: analysis, error: analysisError } = await this.supabase
      .from("document_analyses")
      .select("id")
      .eq("document_id", data.id)
      .maybeSingle();

    if (analysisError) {
      throw new Error(
        `Error al consultar análisis existente: ${analysisError.message}`,
      );
    }
    if (!analysis) {
      throw new Error("Documento idempotente sin análisis asociado");
    }

    return UploadDocumentResponseSchema.parse({
      document: mapRow(data),
      analysis_id: analysis.id,
    });
  }

  async createPendingWithQuota(input: {
    id: string;
    organizationId: string;
    propertyId: string;
    storagePath: string;
    filename: string;
    mimeType: string;
    idempotencyKey: string;
    dailyLimit: number;
  }): Promise<{
    documentId: string;
    analysisId: string;
    created: boolean;
  }> {
    const { data, error } = await this.supabase.rpc(
      "create_pending_document",
      {
        p_document_id: input.id,
        p_organization_id: input.organizationId,
        p_property_id: input.propertyId,
        p_storage_path: input.storagePath,
        p_filename: input.filename,
        p_mime_type: input.mimeType,
        p_idempotency_key: input.idempotencyKey,
        p_daily_limit: input.dailyLimit,
      },
    );

    if (error) {
      throw new Error(error.message);
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (
      !row ||
      typeof row.document_id !== "string" ||
      typeof row.analysis_id !== "string" ||
      typeof row.created !== "boolean"
    ) {
      throw new Error("Respuesta inválida al crear documento pendiente");
    }

    return {
      documentId: row.document_id,
      analysisId: row.analysis_id,
      created: row.created,
    };
  }

  async findById(id: string): Promise<Document> {
    const { data, error } = await this.supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      throw new Error(
        `Error al consultar documento creado: ${error?.message ?? "sin datos"}`,
      );
    }

    return mapRow(data);
  }

  buildStoragePath(
    organizationId: string,
    propertyId: string,
    documentId: string,
  ): string {
    return `${organizationId}/${propertyId}/${documentId}.pdf`;
  }

  newDocumentId(): string {
    return randomUUID();
  }
}
