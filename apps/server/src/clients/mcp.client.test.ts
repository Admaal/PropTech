import { beforeEach, describe, expect, it, vi } from "vitest";

const { config } = vi.hoisted(() => ({
  config: {
    mcpServerUrl: "http://mcp.test",
    internalServiceKey: "k".repeat(32),
  },
}));

vi.mock("../lib/config.js", () => ({ serverConfig: config }));
vi.mock("../lib/supabase.js", () => ({ createUserClient: vi.fn() }));

import { dispatchAnalysisJob } from "./mcp.client.js";

const job = {
  analysisId: "an-1",
  documentId: "doc-1",
  storagePath: "org-1/prop-1/doc-1.pdf",
  organizationId: "org-1",
};

describe("dispatchAnalysisJob — correlación", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 202 })),
    );
  });

  it("envía el requestId del upload en la cabecera X-Request-ID a mcp-ai", async () => {
    dispatchAnalysisJob(job, "token", "req-123");

    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    const init = vi.mocked(fetch).mock.calls[0]?.[1];
    const headers = init?.headers as Record<string, string>;
    expect(headers["X-Request-ID"]).toBe("req-123");
  });
});
