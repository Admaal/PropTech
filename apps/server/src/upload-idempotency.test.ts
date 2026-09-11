import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const demoPassword = process.env.DEMO_USER_PASSWORD;
const shouldRun = Boolean(
  process.env.RUN_SUPABASE_INTEGRATION === "true" &&
    url &&
    anonKey &&
    demoPassword,
);

describe.skipIf(!shouldRun)("uploads — idempotencia y carrera", () => {
  let client: SupabaseClient;
  let propertyId: string;
  let organizationId: string;

  beforeAll(async () => {
    const authClient = createClient(url!, anonKey!);
    const { data, error } = await authClient.auth.signInWithPassword({
      email: "demo-a@test.com",
      password: demoPassword!,
    });

    if (error || !data.session) {
      throw new Error(`Login demo-a falló: ${error?.message ?? "sin sesión"}`);
    }

    client = createClient(url!, anonKey!, {
      global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    });

    const { data: property, error: propertyError } = await client
      .from("properties")
      .select("id, organization_id")
      .eq("organization_id", "11111111-1111-1111-1111-111111111111")
      .limit(1)
      .single();

    if (propertyError || !property) {
      throw new Error(
        `No se pudo preparar propiedad de integración: ${
          propertyError?.message ?? "sin datos"
        }`,
      );
    }

    propertyId = property.id;
    organizationId = property.organization_id;
  });

  it("dos envíos concurrentes con la misma clave crean un solo análisis", async () => {
    const idempotencyKey = `integration-${randomUUID()}`;
    const documentIds = [randomUUID(), randomUUID()];

    const results = await Promise.all(
      documentIds.map((documentId) =>
        client.rpc("create_pending_document", {
          p_document_id: documentId,
          p_organization_id: organizationId,
          p_property_id: propertyId,
          p_storage_path: `${organizationId}/${propertyId}/${documentId}.pdf`,
          p_filename: "integration.pdf",
          p_mime_type: "application/pdf",
          p_idempotency_key: idempotencyKey,
          p_daily_limit: 0,
        }),
      ),
    );

    expect(results.every((result) => result.error === null)).toBe(true);
    const rows = results.map((result) =>
      Array.isArray(result.data) ? result.data[0] : result.data,
    );
    expect(new Set(rows.map((row) => row?.document_id)).size).toBe(1);
    expect(new Set(rows.map((row) => row?.analysis_id)).size).toBe(1);
    expect(rows.filter((row) => row?.created === true)).toHaveLength(1);

    const { data: documents, error } = await client
      .from("documents")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("idempotency_key", idempotencyKey);

    expect(error).toBeNull();
    expect(documents).toHaveLength(1);

    await client
      .from("documents")
      .delete()
      .eq("id", rows[0]?.document_id as string);
  });

  it("dos claves distintas no pueden consumir el último cupo a la vez", async () => {
    // La función evalúa la cuota contando solo los análisis del día (medianoche
    // UTC) y capea el límite público a 3/día. El test debe medir con el mismo
    // filtro: contar el histórico total rompería el escenario de "un solo
    // hueco" en organizaciones con datos de días anteriores.
    const startOfDayUtc = new Date();
    startOfDayUtc.setUTCHours(0, 0, 0, 0);

    const { count, error: countError } = await client
      .from("document_analyses")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("created_at", startOfDayUtc.toISOString());

    expect(countError).toBeNull();
    const analysesToday = count ?? 0;
    expect(
      analysesToday,
      "la cuota pública de hoy (3) ya está agotada; el escenario de último cupo no se puede montar",
    ).toBeLessThan(3);
    const dailyLimit = analysesToday + 1;
    const documentIds = [randomUUID(), randomUUID()];

    const results = await Promise.all(
      documentIds.map((documentId) =>
        client.rpc("create_pending_document", {
          p_document_id: documentId,
          p_organization_id: organizationId,
          p_property_id: propertyId,
          p_storage_path: `${organizationId}/${propertyId}/${documentId}.pdf`,
          p_filename: "quota-integration.pdf",
          p_mime_type: "application/pdf",
          p_idempotency_key: `quota-${randomUUID()}`,
          p_daily_limit: dailyLimit,
        }),
      ),
    );

    expect(results.filter((result) => result.error === null)).toHaveLength(1);
    expect(
      results.filter((result) => result.error?.message.includes("QUOTA_EXCEEDED")),
    ).toHaveLength(1);

    const successful = results.find((result) => result.error === null);
    const successfulRow = Array.isArray(successful?.data)
      ? successful.data[0]
      : successful?.data;
    await client
      .from("documents")
      .delete()
      .eq("id", successfulRow?.document_id as string);
  });
});
