import { beforeEach, describe, expect, it, vi } from "vitest";

const { claim, markFailed } = vi.hoisted(() => ({
  claim: vi.fn(),
  markFailed: vi.fn(),
}));

vi.mock("./lib/supabase.js", () => ({
  createServiceClient: () => ({
    storage: {
      from: () => ({
        download: async () => ({ data: null, error: { message: "sin datos" } }),
      }),
    },
  }),
}));

vi.mock("./job-recovery.js", () => ({
  claimAnalysisJob: claim,
  markAnalysisFailed: markFailed,
  startLeaseHeartbeat: () => () => {},
}));

import { runAnalysis } from "./analyze.js";

const job = {
  analysisId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  documentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  storagePath: "11111111-1111-4111-8111-111111111111/prop/doc.pdf",
  organizationId: "11111111-1111-4111-8111-111111111111",
};

const claimed = { ...job, attemptCount: 1 };
const gemini = { apiKey: "test-key", models: ["gemini-test"] };

describe("runAnalysis — resultado para el transporte (AC-04..AC-07)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("si el job no se puede reclamar (ya resuelto o con lease vigente) devuelve skipped (AC-05)", async () => {
    claim.mockResolvedValue(null);
    expect(await runAnalysis(job, "req-1", gemini)).toBe("skipped");
    expect(markFailed).not.toHaveBeenCalled();
  });

  it("si Supabase no responde al reclamar devuelve transient (AC-06)", async () => {
    claim.mockRejectedValue(new Error("supabase caído"));
    expect(await runAnalysis(job, "req-1", gemini)).toBe("transient");
  });

  it("si el análisis falla por negocio lo marca como failed y devuelve failed (AC-07)", async () => {
    claim.mockResolvedValue(claimed);
    markFailed.mockResolvedValue(undefined);
    expect(await runAnalysis(job, "req-1", gemini)).toBe("failed");
    expect(markFailed).toHaveBeenCalled();
  });

  it("si además no se puede marcar como failed (infraestructura) devuelve transient (AC-06)", async () => {
    claim.mockResolvedValue(claimed);
    markFailed.mockRejectedValue(new Error("supabase caído"));
    expect(await runAnalysis(job, "req-1", gemini)).toBe("transient");
  });
});
