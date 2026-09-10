import { isSecureInternalServiceKey } from "@proptech/shared";
import { z } from "zod";

const RawServerConfigSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  CORS_ORIGIN: z.string().url().default("http://localhost:3000"),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  MCP_SERVER_URL: z.string().url().default("http://localhost:3002"),
  INTERNAL_SERVICE_KEY: z.string().trim().min(1).optional(),
  DAILY_ANALYSIS_QUOTA: z.coerce.number().int().min(0).default(3),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  UPLOAD_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
});

export interface ServerRuntimeConfig {
  nodeEnv: "development" | "test" | "production";
  apiPort: number;
  corsOrigin: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  mcpServerUrl: string;
  internalServiceKey?: string;
  dailyAnalysisQuota: number;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  uploadRateLimitMax: number;
}

export function parseServerConfig(
  input: Record<string, string | undefined>,
): ServerRuntimeConfig {
  const parsed = RawServerConfigSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(
      `Configuración del server inválida: ${parsed.error.issues
        .map((issue) => issue.path.join("."))
        .join(", ")}`,
    );
  }

  const env = parsed.data;
  if (env.NODE_ENV === "production") {
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
      throw new Error(
        "SUPABASE_URL y SUPABASE_ANON_KEY son obligatorios en producción",
      );
    }
    if (!isSecureInternalServiceKey(env.INTERNAL_SERVICE_KEY)) {
      throw new Error(
        "INTERNAL_SERVICE_KEY debe ser una clave aleatoria de al menos 32 caracteres en producción",
      );
    }
    if (env.DAILY_ANALYSIS_QUOTA !== 3) {
      throw new Error("DAILY_ANALYSIS_QUOTA debe ser exactamente 3 en producción");
    }
    if (!env.CORS_ORIGIN.startsWith("https://")) {
      throw new Error("CORS_ORIGIN debe usar HTTPS en producción");
    }
    if (!env.MCP_SERVER_URL.startsWith("https://")) {
      throw new Error("MCP_SERVER_URL debe usar HTTPS en producción");
    }
  }

  return {
    nodeEnv: env.NODE_ENV,
    apiPort: env.API_PORT,
    corsOrigin: env.CORS_ORIGIN,
    supabaseUrl: env.SUPABASE_URL,
    supabaseAnonKey: env.SUPABASE_ANON_KEY,
    mcpServerUrl: env.MCP_SERVER_URL,
    internalServiceKey: env.INTERNAL_SERVICE_KEY,
    dailyAnalysisQuota: env.DAILY_ANALYSIS_QUOTA,
    rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
    rateLimitMax: env.RATE_LIMIT_MAX,
    uploadRateLimitMax: env.UPLOAD_RATE_LIMIT_MAX,
  };
}
