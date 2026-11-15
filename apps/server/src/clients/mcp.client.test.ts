import { beforeEach, describe, expect, it, vi } from "vitest";

const { config } = vi.hoisted(() => ({
  config: {
    mcpServerUrl: "http://mcp.test",
    internalServiceKey: "k".repeat(32),
    analysisTransport: "http" as "http" | "pubsub",
    gcpProjectId: "proj-test",
    analysisTopic: "analysis-jobs",
  },
}));

const { updateSpy } = vi.hoisted(() => ({
  updateSpy: { in: vi.fn().mockResolvedValue({ error: null }) },
}));

vi.mock("../lib/config.js", () => ({ serverConfig: config }));
vi.mock("../lib/supabase.js", () => ({
  createUserClient: vi.fn(() => ({
    from: () => ({
      update: () => ({ eq: () => ({ in: updateSpy.in }) }),
    }),
  })),
}));

import { dispatchAnalysisJob } from "./mcp.client.js";

const job = {
  analysisId: "an-1",
  documentId: "doc-1",
  storagePath: "org-1/prop-1/doc-1.pdf",
  organizationId: "org-1",
};

describe("dispatchAnalysisJob — HTTP (por defecto)", () => {
  beforeEach(() => {
    config.analysisTransport = "http";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 202 })),
    );
  });

  it("envía el requestId del upload en la cabecera X-Request-ID a mcp-ai", async () => {
    await dispatchAnalysisJob(job, "token", "req-123");

    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    const init = vi.mocked(fetch).mock.calls[0]?.[1];
    const headers = init?.headers as Record<string, string>;
    expect(headers["X-Request-ID"]).toBe("req-123");
  });
});

describe("dispatchAnalysisJob — Pub/Sub", () => {
  beforeEach(() => {
    config.analysisTransport = "pubsub";
    updateSpy.in.mockClear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("metadata.google.internal")) {
          return new Response(JSON.stringify({ access_token: "token-de-servicio" }), { status: 200 });
        }
        return new Response(JSON.stringify({ messageIds: ["1"] }), { status: 200 });
      }),
    );
  });

  it("no resuelve hasta que el mensaje está publicado", async () => {
    await dispatchAnalysisJob(job, "token", "req-123");

    const urls = vi.mocked(fetch).mock.calls.map(([url]) => String(url));
    expect(urls.some((u) => u.includes("pubsub.googleapis.com"))).toBe(true);
  });

  it("si la publicación falla, marca el análisis como failed y no lanza", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("metadata.google.internal")) {
          return new Response(JSON.stringify({ access_token: "token-de-servicio" }), { status: 200 });
        }
        return new Response("boom", { status: 500 });
      }),
    );

    await expect(dispatchAnalysisJob(job, "token", "req-123")).resolves.toBeUndefined();
    expect(updateSpy.in).toHaveBeenCalledWith("status", ["pending", "processing"]);
  });
});
