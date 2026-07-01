import { describe, expect, it } from "vitest";
import { assertJobMatchesRecords } from "./validate-analysis-job.js";

const job = {
  analysisId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  documentId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  organizationId: "11111111-1111-1111-1111-111111111111",
  storagePath:
    "11111111-1111-1111-1111-111111111111/cccccccc-cccc-cccc-cccc-cccccccccccc/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.pdf",
};

const analysis = {
  id: job.analysisId,
  document_id: job.documentId,
  organization_id: job.organizationId,
  status: "pending",
};

const document = {
  id: job.documentId,
  organization_id: job.organizationId,
  storage_path: job.storagePath,
};

describe("assertJobMatchesRecords", () => {
  it("acepta un job coherente con DB", () => {
    expect(assertJobMatchesRecords(job, analysis, document)).toBeNull();
  });

  it("rechaza organizationId distinto", () => {
    expect(
      assertJobMatchesRecords(
        job,
        analysis,
        { ...document, organization_id: "22222222-2222-2222-2222-222222222222" },
      ),
    ).toBe("documento no pertenece a la organización");
  });

  it("rechaza storagePath distinto", () => {
    expect(
      assertJobMatchesRecords(job, analysis, {
        ...document,
        storage_path: "11111111-1111-1111-1111-111111111111/other/doc.pdf",
      }),
    ).toBe("storagePath no coincide");
  });

  it("rechaza análisis no pending", () => {
    expect(
      assertJobMatchesRecords(job, { ...analysis, status: "completed" }, document),
    ).toBe("Estado inválido: completed");
  });

  it("rechaza documentId distinto", () => {
    expect(
      assertJobMatchesRecords(
        { ...job, documentId: "dddddddd-dddd-dddd-dddd-dddddddddddd" },
        analysis,
        document,
      ),
    ).toBe("documentId no coincide");
  });
});
