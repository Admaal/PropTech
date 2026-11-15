import { AnalyzeJobSchema, type AnalyzeJob } from "@proptech/shared";
import { z } from "zod";
import { logEvent } from "./logger.js";
import { resolveRequestId } from "./request-id.js";

// completed/failed/skipped son finales: se responden 2xx. transient se responde 5xx.
export type AnalysisOutcome = "completed" | "failed" | "skipped" | "transient";

export interface PushTokenPayload {
  email?: string;
  email_verified?: boolean;
}

export type VerifyIdToken = (
  token: string,
  audience: string,
) => Promise<PushTokenPayload>;

// Verifica el OIDC del push: firma y audiencia (en verifyIdToken), cuenta de la suscripción y email verificado.
export function makePushAuthorizer(options: {
  audience: string;
  serviceAccountEmail: string;
  verifyIdToken: VerifyIdToken;
}): (authorization: string | undefined) => Promise<boolean> {
  return async (authorization) => {
    if (!authorization?.startsWith("Bearer ")) return false;
    const token = authorization.slice("Bearer ".length).trim();
    if (!token) return false;
    try {
      const payload = await options.verifyIdToken(token, options.audience);
      return (
        payload.email === options.serviceAccountEmail &&
        payload.email_verified === true
      );
    } catch {
      return false;
    }
  };
}

const PushEnvelopeSchema = z.object({
  message: z.object({
    data: z.string(),
    attributes: z.record(z.string(), z.string()).optional(),
    messageId: z.string().optional(),
  }),
});

export interface PushDeps {
  authorize(authorization: string | undefined): Promise<boolean>;
  processJob(job: AnalyzeJob, requestId: string): Promise<AnalysisOutcome>;
}

// Lógica del endpoint /pubsub/analyze sin Express, para poder testearla.
export async function handlePubsubPush(
  input: { authorization?: string; body: unknown },
  deps: PushDeps,
): Promise<{ status: number }> {
  if (!(await deps.authorize(input.authorization))) {
    return { status: 401 };
  }

  const envelope = PushEnvelopeSchema.safeParse(input.body);
  if (!envelope.success) {
    logEvent("error", "envoltorio de push inválido", { service: "mcp-ai" });
    return { status: 204 };
  }

  const { data, attributes } = envelope.data.message;
  let job: AnalyzeJob;
  try {
    const decoded: unknown = JSON.parse(Buffer.from(data, "base64").toString("utf8"));
    job = AnalyzeJobSchema.parse(decoded);
  } catch {
    // Sin datos del documento en el log: solo que el payload no es válido.
    logEvent("error", "payload de análisis inválido", { service: "mcp-ai" });
    return { status: 204 };
  }

  const requestId = resolveRequestId(attributes?.requestId);
  const outcome = await deps.processJob(job, requestId);
  return { status: outcome === "transient" ? 500 : 204 };
}
