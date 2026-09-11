import type { SupabaseClient } from "@supabase/supabase-js";
import type { UploadDocumentResponse } from "@proptech/shared";
import { DocumentRepository } from "../repositories/document.repository.js";
import { PropertyRepository } from "../repositories/property.repository.js";
import { dispatchAnalysisJob } from "../clients/mcp.client.js";
import { serverConfig } from "../lib/config.js";
import { isPdfBuffer } from "../lib/pdf-validation.js";
import { sanitizeFilename } from "../lib/sanitize-filename.js";

const MAX_PDF_BYTES = 10 * 1024 * 1024;
const PUBLIC_DAILY_ANALYSIS_LIMIT = 3;

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

  constructor(private readonly supabase: SupabaseClient) {
    this.documents = new DocumentRepository(supabase);
    this.properties = new PropertyRepository(supabase);
  }

  async uploadForProperty(input: {
    propertyId: string;
    file: Express.Multer.File;
    skipQuota?: boolean;
    accessToken: string;
    idempotencyKey: string;
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

    const existing = await this.documents.findExistingUpload(
      property.organization_id,
      input.idempotencyKey,
    );
    if (existing) return existing;

    const safeFilename = sanitizeFilename(input.file.originalname);
    const documentId = this.documents.newDocumentId();
    const dailyLimit = input.skipQuota
      ? 0
      : Math.max(
          serverConfig.dailyAnalysisQuota,
          PUBLIC_DAILY_ANALYSIS_LIMIT,
        );
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

    let created: {
      documentId: string;
      analysisId: string;
      created: boolean;
    };

    try {
      created = await this.documents.createPendingWithQuota({
        id: documentId,
        organizationId: property.organization_id,
        propertyId: property.id,
        storagePath,
        filename: safeFilename,
        mimeType: input.file.mimetype,
        idempotencyKey: input.idempotencyKey,
        dailyLimit,
      });
    } catch (error) {
      await this.cleanupStorageOrThrow(storagePath);
      const message = error instanceof Error ? error.message : "";
      if (message.includes("QUOTA_EXCEEDED")) {
        throw new DocumentUploadError(
          "QUOTA_EXCEEDED",
          `Límite diario de análisis alcanzado (${dailyLimit}/día)`,
        );
      }
      if (message.includes("PROPERTY_NOT_FOUND")) {
        throw new DocumentUploadError(
          "NOT_FOUND",
          "Propiedad no encontrada",
        );
      }
      if (message.includes("IDEMPOTENCY_KEY_CONFLICT")) {
        throw new DocumentUploadError(
          "IDEMPOTENCY_KEY_CONFLICT",
          "La clave de idempotencia ya está asociada a otra propiedad",
        );
      }
      throw error;
    }

    if (!created.created) {
      await this.cleanupStorageOrThrow(storagePath);
      const replay = await this.documents.findExistingUpload(
        property.organization_id,
        input.idempotencyKey,
      );
      if (!replay) {
        throw new Error("No se pudo recuperar el upload idempotente");
      }
      return replay;
    }

    const document = await this.documents.findById(created.documentId);

    dispatchAnalysisJob(
      {
        analysisId: created.analysisId,
        documentId: document.id,
        storagePath,
        organizationId: property.organization_id,
      },
      input.accessToken,
    );

    return { document, analysis_id: created.analysisId };
  }

  private async cleanupStorageOrThrow(storagePath: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from("documents")
      .remove([storagePath]);

    if (error) {
      throw new DocumentUploadError(
        "UPLOAD_ROLLBACK_FAILED",
        "No se pudo revertir el archivo temporal de la subida",
      );
    }
  }
}
