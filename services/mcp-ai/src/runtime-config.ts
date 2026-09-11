import { isSecureInternalServiceKey } from "@proptech/shared";
import { z } from "zod";

const RawMcpConfigSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  MCP_PORT: z.coerce.number().int().min(1).max(65_535).default(3002),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  INTERNAL_SERVICE_KEY: z.string().trim().min(1),
  GEMINI_MODEL: z.string().optional(),
});

export interface McpRuntimeConfig {
  nodeEnv: "development" | "test" | "production";
  port: number;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  geminiApiKey: string;
  internalServiceKey: string;
  geminiModels: string[];
}

const DEFAULT_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-2.5-flash-lite",
];

export function parseMcpConfig(
  input: Record<string, string | undefined>,
): McpRuntimeConfig {
  const parsed = RawMcpConfigSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(
      `Configuración de mcp-ai inválida: ${parsed.error.issues
        .map((issue) => issue.path.join("."))
        .join(", ")}`,
    );
  }

  const env = parsed.data;
  const geminiModels =
    env.GEMINI_MODEL?.split(",").map((model) => model.trim()).filter(Boolean) ??
    DEFAULT_MODELS;

  if (geminiModels.length === 0) {
    throw new Error("GEMINI_MODEL debe contener al menos un modelo");
  }
  if (
    env.NODE_ENV === "production" &&
    !isSecureInternalServiceKey(env.INTERNAL_SERVICE_KEY)
  ) {
    throw new Error(
      "INTERNAL_SERVICE_KEY debe ser una clave aleatoria de al menos 32 caracteres en producción",
    );
  }

  return {
    nodeEnv: env.NODE_ENV,
    port: env.MCP_PORT,
    supabaseUrl: env.SUPABASE_URL,
    supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    geminiApiKey: env.GEMINI_API_KEY,
    internalServiceKey: env.INTERNAL_SERVICE_KEY,
    geminiModels,
  };
}
