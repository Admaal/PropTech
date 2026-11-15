import { describe, expect, it, vi } from "vitest";
import {
  handlePubsubPush,
  makePushAuthorizer,
  type AnalysisOutcome,
} from "./pubsub-push.js";

const job = {
  analysisId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  documentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  storagePath: "11111111-1111-4111-8111-111111111111/prop/doc.pdf",
  organizationId: "11111111-1111-4111-8111-111111111111",
};

function envelope(payload: unknown, attributes: Record<string, string> = {}) {
  return {
    message: {
      data: Buffer.from(JSON.stringify(payload), "utf8").toString("base64"),
      attributes,
      messageId: "m-1",
    },
    subscription: "projects/p/subscriptions/analysis-push",
  };
}

function deps(outcome: AnalysisOutcome = "completed", authorized = true) {
  return {
    authorize: vi.fn(async () => authorized),
    processJob: vi.fn(async () => outcome),
  };
}

describe("makePushAuthorizer (AC-03)", () => {
  const expected = {
    audience: "https://mcp.test/pubsub/analyze",
    serviceAccountEmail: "analysis-push@p.iam.gserviceaccount.com",
  };

  it("rechaza peticiones sin cabecera Bearer", async () => {
    const authorize = makePushAuthorizer({
      ...expected,
      verifyIdToken: vi.fn(),
    });
    expect(await authorize(undefined)).toBe(false);
    expect(await authorize("Basic abc")).toBe(false);
  });

  it("rechaza un token que no verifica", async () => {
    const authorize = makePushAuthorizer({
      ...expected,
      verifyIdToken: vi.fn(async () => {
        throw new Error("firma no válida");
      }),
    });
    expect(await authorize("Bearer x")).toBe(false);
  });

  it("rechaza una cuenta distinta de la suscripción", async () => {
    const authorize = makePushAuthorizer({
      ...expected,
      verifyIdToken: vi.fn(async () => ({
        email: "otra@p.iam.gserviceaccount.com",
        email_verified: true,
      })),
    });
    expect(await authorize("Bearer x")).toBe(false);
  });

  it("rechaza un email no verificado", async () => {
    const authorize = makePushAuthorizer({
      ...expected,
      verifyIdToken: vi.fn(async () => ({
        email: expected.serviceAccountEmail,
        email_verified: false,
      })),
    });
    expect(await authorize("Bearer x")).toBe(false);
  });

  it("acepta el token de la cuenta de la suscripción con la audiencia esperada", async () => {
    const verify = vi.fn(async () => ({
      email: expected.serviceAccountEmail,
      email_verified: true,
    }));
    const authorize = makePushAuthorizer({ ...expected, verifyIdToken: verify });

    expect(await authorize("Bearer tok-123")).toBe(true);
    expect(verify).toHaveBeenCalledWith("tok-123", expected.audience);
  });
});

describe("handlePubsubPush", () => {
  it("responde 401 sin procesar si la autorización falla (AC-03)", async () => {
    const d = deps("completed", false);
    const res = await handlePubsubPush({ authorization: "Bearer x", body: envelope(job) }, d);
    expect(res.status).toBe(401);
    expect(d.processJob).not.toHaveBeenCalled();
  });

  it("responde 2xx solo tras el resultado final del análisis (AC-04)", async () => {
    const d = deps("completed");
    const res = await handlePubsubPush({ authorization: "Bearer x", body: envelope(job) }, d);
    expect(res.status).toBe(204);
    expect(d.processJob).toHaveBeenCalledWith(expect.objectContaining(job), expect.any(String));
  });

  it("un análisis ya resuelto o con lease vigente responde 2xx sin reprocesar (AC-05)", async () => {
    const d = deps("skipped");
    const res = await handlePubsubPush({ authorization: "Bearer x", body: envelope(job) }, d);
    expect(res.status).toBe(204);
  });

  it("un fallo de negocio responde 2xx: no se reintenta por Pub/Sub (AC-07)", async () => {
    const d = deps("failed");
    const res = await handlePubsubPush({ authorization: "Bearer x", body: envelope(job) }, d);
    expect(res.status).toBe(204);
  });

  it("un fallo de infraestructura responde 5xx para que Pub/Sub reintente (AC-06)", async () => {
    const d = deps("transient");
    const res = await handlePubsubPush({ authorization: "Bearer x", body: envelope(job) }, d);
    expect(res.status).toBeGreaterThanOrEqual(500);
  });

  it("un payload que no cumple el schema responde 2xx y no procesa (AC-08)", async () => {
    const d = deps("completed");
    const res = await handlePubsubPush(
      { authorization: "Bearer x", body: envelope({ analysisId: "no-es-uuid" }) },
      d,
    );
    expect(res.status).toBe(204);
    expect(d.processJob).not.toHaveBeenCalled();
  });

  it("un envoltorio mal formado responde 2xx y no procesa (AC-08)", async () => {
    const d = deps("completed");
    const res = await handlePubsubPush({ authorization: "Bearer x", body: { nada: true } }, d);
    expect(res.status).toBe(204);
    expect(d.processJob).not.toHaveBeenCalled();
  });

  it("usa el requestId del atributo y genera uno si no es válido (PR 4)", async () => {
    const d = deps("completed");
    await handlePubsubPush(
      { authorization: "Bearer x", body: envelope(job, { requestId: "req-ok" }) },
      d,
    );
    expect(d.processJob).toHaveBeenLastCalledWith(expect.anything(), "req-ok");

    await handlePubsubPush(
      { authorization: "Bearer x", body: envelope(job, { requestId: "mal\nid" }) },
      d,
    );
    expect(d.processJob).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.not.stringContaining("\n"),
    );
  });
});
