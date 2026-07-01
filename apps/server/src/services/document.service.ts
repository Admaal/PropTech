import type { SupabaseClient } from "@supabase/supabase-js";
import type { Document, UploadDocumentResponse } from "@proptech/shared";
import { DocumentRepository } from "../repositories/document.repository.js";
import { PropertyRepository } from "../repositories/property.repository.js";
import { AnalysisRepository } from "../repositories/analysis.repository.js";
import { dispatchAnalysisJob } from "../clients/mcp.client.js";
import { serverConfig } from "../lib/config.js";
import { isAnalysisQuotaExceeded, isPdfBuffer } from "../lib/pdf-validation.js";
import { sanitizeFilename } from "../lib/sanitize-filename.js";

const MAX_PDF_BYTES = 10 * 1024 * 1024;

export class DocumentUploadError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "DocumentUploadError";
  }
}

export class DocumentService {
  private readonly documents: DocumentRepository;
  private readonly properties: PropertyRepository;
  private readonly analyses: AnalysisRepository;

  constructor(private readonly supabase: SupabaseClient) {
    this.documents = new DocumentRepository(supabase);
    this.properties = new PropertyRepository(supabase);
    this.analyses = new AnalysisRepository(supabase);
  }

  async uploadForProperty(input: {
    propertyId: string;
    file: Express.Multer.File;
    skipQuota?: boolean;
  }): Promise<UploadDocumentResponse> {
    if (input.file.mimetype !== "application/pdf") {
      throw new DocumentUploadError(
        "INVALID_FILE_TYPE",
        "Solo se permiten archivos PDF",
      );
    }

    if (!isPdfBuffer(input.file.buffer)) {
      throw new DocumentUploadError(
        "INVALID_FILE_TYPE",
        "El archivo no es un PDF válido",
      );
    }

    if (input.file.size > MAX_PDF_BYTES) {
      throw new DocumentUploadError(
        "FILE_TOO_LARGE",
        "El archivo no puede superar 10 MB",
      );
    }

    const property = await this.properties.findById(input.propertyId);
    if (!property) {
      throw new DocumentUploadError(
        "NOT_FOUND",
        "Propiedad no encontrada",
      );
    }

    const analysesToday = await this.analyses.countCreatedToday(
      property.organization_id,
    );
    if (
      !input.skipQuota &&
      isAnalysisQuotaExceeded(analysesToday, serverConfig.dailyAnalysisQuota)
    ) {
      throw new DocumentUploadError(
        "QUOTA_EXCEEDED",
        `Límite diario de análisis alcanzado (${serverConfig.dailyAnalysisQuota}/día)`,
      );
    }

    const safeFilename = sanitizeFilename(input.file.originalname);
    const documentId = this.documents.newDocumentId();
    const storagePath = this.documents.buildStoragePath(
      property.organization_id,
      property.id,
      documentId,
    );

    const { error: storageError } = await this.supabase.storage
      .from("documents")
      .upload(storagePath, input.file.buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (storageError) {
      throw new Error(`Error al subir PDF: ${storageError.message}`);
    }

    const document: Document = await this.documents.create({
      id: documentId,
      organizationId: property.organization_id,
      propertyId: property.id,
      storagePath,
      filename: safeFilename,
      mimeType: input.file.mimetype,
    });

    const analysisId = await this.documents.createPendingAnalysis({
      documentId: document.id,
      organizationId: property.organization_id,
    });

    dispatchAnalysisJob({
      analysisId,
      documentId: document.id,
      storagePath,
      organizationId: property.organization_id,
    });

    return { document, analysis_id: analysisId };
  }
}
