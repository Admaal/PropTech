import type { SupabaseClient } from "@supabase/supabase-js";
import type { Document } from "@proptech/shared";
import { randomUUID } from "node:crypto";

interface DocumentRow {
  id: string;
  organization_id: string;
  property_id: string | null;
  storage_path: string;
  filename: string;
  mime_type: string;
  created_at: string;
}

function mapRow(row: DocumentRow): Document {
  return {
    id: row.id,
    organization_id: row.organization_id,
    property_id: row.property_id,
    storage_path: row.storage_path,
    filename: row.filename,
    mime_type: row.mime_type,
    created_at: row.created_at,
  };
}

export class DocumentRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(input: {
    id: string;
    organizationId: string;
    propertyId: string;
    storagePath: string;
    filename: string;
    mimeType: string;
  }): Promise<Document> {
    const { data, error } = await this.supabase
      .from("documents")
      .insert({
        id: input.id,
        organization_id: input.organizationId,
        property_id: input.propertyId,
        storage_path: input.storagePath,
        filename: input.filename,
        mime_type: input.mimeType,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(`Error al guardar documento: ${error.message}`);
    }

    return mapRow(data as DocumentRow);
  }

  async createPendingAnalysis(input: {
    documentId: string;
    organizationId: string;
  }): Promise<string> {
    const { data, error } = await this.supabase
      .from("document_analyses")
      .insert({
        document_id: input.documentId,
        organization_id: input.organizationId,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(`Error al crear análisis: ${error.message}`);
    }

    return data.id as string;
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
