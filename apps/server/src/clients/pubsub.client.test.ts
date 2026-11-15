import { beforeEach, describe, expect, it, vi } from "vitest";

const { config } = vi.hoisted(() => ({
  config: {
    gcpProjectId: "proj-test",
    analysisTopic: "analysis-jobs",
  },
}));

vi.mock("../lib/config.js", () => ({ serverConfig: config }));

import { publishAnalysisJob } from "./pubsub.client.js";

const job = {
  analysisId: "an-1",
  documentId: "doc-1",
  storagePath: "org-1/prop-1/doc-1.pdf",
  organizationId: "org-1",
};

describe("publishAnalysisJob", () => {
  beforeEach(() => {
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

  it("publica el job en el topic con el requestId como atributo", async () => {
    await publishAnalysisJob(job, "req-123");

    const publishCall = vi
      .mocked(fetch)
      .mock.calls.find(([url]) => String(url).includes("pubsub.googleapis.com"));
    expect(publishCall).toBeDefined();
    const [url, init] = publishCall!;
    expect(String(url)).toBe(
      "https://pubsub.googleapis.com/v1/projects/proj-test/topics/analysis-jobs:publish",
    );

    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer token-de-servicio");

    const body = JSON.parse(String(init?.body)) as {
      messages: { data: string; attributes: Record<string, string> }[];
    };
    expect(body.messages[0]?.attributes.requestId).toBe("req-123");
    const decoded = JSON.parse(
      Buffer.from(body.messages[0]?.data ?? "", "base64").toString("utf8"),
    );
    expect(decoded).toEqual(job);
  });

  it("lanza error si Pub/Sub rechaza la publicación", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("metadata.google.internal")) {
          return new Response(JSON.stringify({ access_token: "token-de-servicio" }), { status: 200 });
        }
        return new Response("boom", { status: 500 });
      }),
    );

    await expect(publishAnalysisJob(job, "req-123")).rejects.toThrow();
  });
});
