import { describe, expect, it } from "vitest";
import { parseServerConfig } from "./runtime-config.js";

const base = {
  NODE_ENV: "development",
  API_PORT: "3001",
  CORS_ORIGIN: "http://localhost:3000",
  MCP_SERVER_URL: "http://localhost:3002",
};

describe("ANALYSIS_TRANSPORT (AC-09)", () => {
  it("usa HTTP por defecto: sin variable, el envío a mcp-ai no cambia", () => {
    expect(parseServerConfig(base).analysisTransport).toBe("http");
  });

  it("acepta pubsub explícitamente, con el topic por defecto", () => {
    const config = parseServerConfig({
      ...base,
      ANALYSIS_TRANSPORT: "pubsub",
      GCP_PROJECT_ID: "proj-test",
    });
    expect(config.analysisTransport).toBe("pubsub");
    expect(config.analysisTopic).toBe("analysis-jobs");
    expect(config.gcpProjectId).toBe("proj-test");
  });

  it("rechaza un valor de transporte desconocido", () => {
    expect(() =>
      parseServerConfig({ ...base, ANALYSIS_TRANSPORT: "kafka" }),
    ).toThrow();
  });
});
