import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const { config, repo, properties } = vi.hoisted(() => ({
  config: { dailyAnalysisQuota: 3 },
  repo: {
    newDocumentId: vi.fn(),
    buildStoragePath: vi.fn(),
    findExistingUpload: vi.fn(),
    createPendingWithQuota: vi.fn(),
    findById: vi.fn(),
  },
  properties: { findById: vi.fn() },
}));

vi.mock("../lib/config.js", () => ({ serverConfig: config }));
vi.mock("../clients/mcp.client.js", () => ({ dispatchAnalysisJob: vi.fn() }));
vi.mock("../repositories/document.repository.js", () => ({
  DocumentRepository: function DocumentRepository() {
    return repo;
  },
}));
vi.mock("../repositories/property.repository.js", () => ({
  PropertyRepository: function PropertyRepository() {
    return properties;
  },
}));

import { dispatchAnalysisJob } from "../clients/mcp.client.js";
import { DocumentService } from "./document.service.js";

const fakeSupabase = {
  storage: {
    from: () => ({
      upload: vi.fn().mockResolvedValue({ error: null }),
      remove: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
} as unknown as SupabaseClient;

const pdfFile = {
  mimetype: "application/pdf",
  buffer: Buffer.from("%PDF-1.4\n%âãÏÓ"),
  size: 16,
  originalname: "informe.pdf",
} as unknown as Express.Multer.File;

function upload(skipQuota?: boolean) {
  return new DocumentService(fakeSupabase).uploadForProperty({
    propertyId: "prop-1",
    file: pdfFile,
    skipQuota,
    accessToken: "token",
    idempotencyKey: "key-1",
    requestId: "req-000",
  });
}

describe("DocumentService.uploadForProperty — límite diario", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    properties.findById.mockResolvedValue({
      id: "prop-1",
      organization_id: "org-1",
    });
    repo.findExistingUpload.mockResolvedValue(null);
    repo.newDocumentId.mockReturnValue("doc-1");
    repo.buildStoragePath.mockReturnValue("org-1/prop-1/doc-1.pdf");
    repo.createPendingWithQuota.mockResolvedValue({
      documentId: "doc-1",
      analysisId: "an-1",
      created: true,
    });
    repo.findById.mockResolvedValue({ id: "doc-1" });
  });

  it("pasa a la RPC la cuota configurada, sin forzar un mínimo de 3", async () => {
    config.dailyAnalysisQuota = 1;

    await upload();

    expect(repo.createPendingWithQuota).toHaveBeenCalledWith(
      expect.objectContaining({ dailyLimit: 1 }),
    );
  });

  it("pasa el requestId del upload al encolar el análisis", async () => {
    await new DocumentService(fakeSupabase).uploadForProperty({
      propertyId: "prop-1",
      file: pdfFile,
      accessToken: "token",
      idempotencyKey: "key-1",
      requestId: "req-123",
    });

    expect(dispatchAnalysisJob).toHaveBeenCalledWith(
      expect.objectContaining({ analysisId: "an-1" }),
      "token",
      "req-123",
    );
  });

  it("pasa 0 a la RPC cuando la subida omite la cuota (admin de plataforma)", async () => {
    config.dailyAnalysisQuota = 3;

    await upload(true);

    expect(repo.createPendingWithQuota).toHaveBeenCalledWith(
      expect.objectContaining({ dailyLimit: 0 }),
    );
  });
});
