import { describe, expect, it } from "vitest";
import { parseMcpConfig } from "./runtime-config.js";

const validProductionEnv = {
  NODE_ENV: "production",
  MCP_PORT: "3002",
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
  GEMINI_API_KEY: "gemini-key",
  INTERNAL_SERVICE_KEY: "a".repeat(32),
  GEMINI_MODEL: "gemini-2.5-flash-lite",
};

describe("parseMcpConfig", () => {
  it("accepts a complete production configuration", () => {
    expect(parseMcpConfig(validProductionEnv)).toMatchObject({
      port: 3002,
      geminiModels: ["gemini-2.5-flash-lite"],
    });
  });

  it("rejects missing provider credentials", () => {
    expect(() =>
      parseMcpConfig({
        ...validProductionEnv,
        GEMINI_API_KEY: "",
      }),
    ).toThrow();
  });

  it("rejects weak internal keys in production", () => {
    expect(() =>
      parseMcpConfig({
        ...validProductionEnv,
        INTERNAL_SERVICE_KEY: "dev-internal-key",
      }),
    ).toThrow();
  });
});
