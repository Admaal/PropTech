import { describe, expect, it, vi } from "vitest";
import {
  calculateRetryDelaySeconds,
  claimAnalysisJob,
  markAnalysisFailed,
} from "./job-recovery.js";

describe("claimAnalysisJob", () => {
  it("does not start work when another worker owns the lease", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    const supabase = { rpc } as never;

    await expect(
      claimAnalysisJob(supabase, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
    ).resolves.toBeNull();
    expect(rpc).toHaveBeenCalledWith("claim_analysis_job", {
      p_analysis_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      p_lease_seconds: 300,
    });
  });

  it("normaliza el job autoritativo devuelto por la base de datos", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          analysis_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          document_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          organization_id: "11111111-1111-1111-1111-111111111111",
          storage_path:
            "11111111-1111-1111-1111-111111111111/property/document.pdf",
          attempt_count: 2,
        },
      ],
      error: null,
    });
    const supabase = { rpc } as never;

    await expect(
      claimAnalysisJob(supabase, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
    ).resolves.toMatchObject({
      analysisId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      documentId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      attemptCount: 2,
    });
  });
});

describe("calculateRetryDelaySeconds", () => {
  it("aplica backoff acotado para reintentos", () => {
    expect(calculateRetryDelaySeconds(1)).toBe(30);
    expect(calculateRetryDelaySeconds(2)).toBe(60);
    expect(calculateRetryDelaySeconds(3)).toBe(120);
    expect(calculateRetryDelaySeconds(99)).toBe(900);
  });
});

describe("markAnalysisFailed", () => {
  it("programa el siguiente intento y libera el lease", async () => {
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    });
    const supabase = {
      from: vi.fn(() => ({ update })),
    } as never;

    await markAnalysisFailed(
      supabase,
      "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "Error transitorio",
      1,
    );

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        lease_until: null,
        next_retry_at: expect.any(String),
      }),
    );
  });
});
