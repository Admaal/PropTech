import type { SupabaseClient } from "@supabase/supabase-js";

interface DocumentStorageRow {
  storage_path: string;
}

interface AnalysisStorageRow {
  document_id: string;
  documents:
    | DocumentStorageRow
    | DocumentStorageRow[]
    | null;
}

export class AdminDataNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminDataNotFoundError";
  }
}

export class AdminDataService {
  constructor(private readonly supabase: SupabaseClient) {}

  async deleteProperty(propertyId: string): Promise<void> {
    const { data: documents, error: documentsError } = await this.supabase
      .from("documents")
      .select("storage_path")
      .eq("property_id", propertyId);

    if (documentsError) {
      throw new Error(`Error al consultar documentos: ${documentsError.message}`);
    }

    await this.removeStorage(
      (documents as DocumentStorageRow[] | null)?.map(
        (document) => document.storage_path,
      ) ?? [],
    );

    const { error: deleteDocumentsError } = await this.supabase
      .from("documents")
      .delete()
      .eq("property_id", propertyId);

    if (deleteDocumentsError) {
      throw new Error(
        `Error al eliminar documentos: ${deleteDocumentsError.message}`,
      );
    }

    const { error: deletePropertyError } = await this.supabase
      .from("properties")
      .delete()
      .eq("id", propertyId);

    if (deletePropertyError) {
      throw new Error(
        `Error al eliminar propiedad: ${deletePropertyError.message}`,
      );
    }
  }

  async deleteAnalysis(analysisId: string): Promise<void> {
    const { data: analysis, error: analysisError } = await this.supabase
      .from("document_analyses")
      .select("document_id, documents(storage_path)")
      .eq("id", analysisId)
      .maybeSingle();

    if (analysisError) {
      throw new Error(`Error al consultar análisis: ${analysisError.message}`);
    }
    if (!analysis) {
      throw new AdminDataNotFoundError("Análisis no encontrado");
    }

    const row = analysis as AnalysisStorageRow;
    const document = Array.isArray(row.documents)
      ? row.documents[0]
      : row.documents;
    await this.removeStorage(document ? [document.storage_path] : []);

    const { error: deleteDocumentError } = await this.supabase
      .from("documents")
      .delete()
      .eq("id", row.document_id);

    if (deleteDocumentError) {
      throw new Error(
        `Error al eliminar documento: ${deleteDocumentError.message}`,
      );
    }
  }

  private async removeStorage(paths: string[]): Promise<void> {
    if (paths.length === 0) return;

    const { error } = await this.supabase.storage
      .from("documents")
      .remove(paths);

    if (error) {
      throw new Error(`Error al eliminar PDFs: ${error.message}`);
    }
  }
}
