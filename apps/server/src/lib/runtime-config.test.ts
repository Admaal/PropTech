import { describe, expect, it } from "vitest";
import { parseServerConfig } from "./runtime-config.js";

const validProductionEnv = {
  NODE_ENV: "production",
  API_PORT: "3001",
  CORS_ORIGIN: "https://portfolio.example",
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  MCP_SERVER_URL: "https://mcp.example.run.app",
  INTERNAL_SERVICE_KEY: "a".repeat(32),
  DAILY_ANALYSIS_QUOTA: "3",
  RATE_LIMIT_WINDOW_MS: "900000",
  RATE_LIMIT_MAX: "100",
  UPLOAD_RATE_LIMIT_MAX: "5",
};

describe("parseServerConfig", () => {
  it("accepts a complete production configuration", () => {
    expect(parseServerConfig(validProductionEnv)).toMatchObject({
      apiPort: 3001,
      dailyAnalysisQuota: 3,
    });
  });

  it("rejects weak internal keys in production", () => {
    expect(() =>
      parseServerConfig({
        ...validProductionEnv,
        INTERNAL_SERVICE_KEY: "dev-internal-key",
      }),
    ).toThrow();
  });

  it("rejects an unlimited production quota", () => {
    expect(() =>
      parseServerConfig({
        ...validProductionEnv,
        DAILY_ANALYSIS_QUOTA: "0",
      }),
    ).toThrow();
  });

  it("rejects a production quota above the database-enforced cap", () => {
    expect(() =>
      parseServerConfig({
        ...validProductionEnv,
        DAILY_ANALYSIS_QUOTA: "4",
      }),
    ).toThrow();
  });

  it("rejects invalid ports and origins", () => {
    expect(() =>
      parseServerConfig({
        ...validProductionEnv,
        API_PORT: "70000",
      }),
    ).toThrow();
    expect(() =>
      parseServerConfig({
        ...validProductionEnv,
        CORS_ORIGIN: "not-a-url",
      }),
    ).toThrow();
  });
});
