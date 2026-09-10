import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

const url =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey =
  process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const demoPassword = process.env.DEMO_USER_PASSWORD;

const hasCredentials = Boolean(url && anonKey && demoPassword);
const integrationEnabled = process.env.RUN_SUPABASE_INTEGRATION === "true";

function rlsRequiredInCi(): boolean {
  return (
    process.env.CI === "true" &&
    process.env.GITHUB_EVENT_NAME === "push" &&
    (process.env.GITHUB_REF === "refs/heads/main" ||
      process.env.GITHUB_REF === "refs/heads/master")
  );
}

describe("RLS — configuración CI", () => {
  it("credenciales Supabase completas si alguna está configurada", () => {
    if (!rlsRequiredInCi()) return;
    expect(
      hasCredentials && integrationEnabled,
      "La integración RLS de main requiere SUPABASE_URL, SUPABASE_ANON_KEY, DEMO_USER_PASSWORD y RUN_SUPABASE_INTEGRATION=true",
    ).toBe(true);
  });
});

describe.skipIf(!hasCredentials || !integrationEnabled)(
  "RLS — aislamiento cross-org",
  () => {
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    const clientA = createClient(url!, anonKey!);
    const clientB = createClient(url!, anonKey!);

    const [resA, resB] = await Promise.all([
      clientA.auth.signInWithPassword({
        email: "demo-a@test.com",
        password: demoPassword!,
      }),
      clientB.auth.signInWithPassword({
        email: "demo-b@test.com",
        password: demoPassword!,
      }),
    ]);

    if (resA.error || !resA.data.session) {
      throw new Error(`Login demo-a falló: ${resA.error?.message}`);
    }
    if (resB.error || !resB.data.session) {
      throw new Error(`Login demo-b falló: ${resB.error?.message}`);
    }

    tokenA = resA.data.session.access_token;
    tokenB = resB.data.session.access_token;
  });

  it("demo-a ve al menos 12 propiedades de su org seed", async () => {
    const client = createClient(url!, anonKey!, {
      global: { headers: { Authorization: `Bearer ${tokenA}` } },
    });
    const { data, error } = await client
      .from("properties")
      .select("id")
      .eq("organization_id", "11111111-1111-1111-1111-111111111111");

    expect(error).toBeNull();
    expect(data!.length).toBe(12);
  });

  it("demo-b ve al menos 8 propiedades de su org seed", async () => {
    const client = createClient(url!, anonKey!, {
      global: { headers: { Authorization: `Bearer ${tokenB}` } },
    });
    const { data, error } = await client
      .from("properties")
      .select("id")
      .eq("organization_id", "22222222-2222-2222-2222-222222222222");

    expect(error).toBeNull();
    expect(data!.length).toBe(8);
  });

  it("demo-a no puede leer propiedades de la org de demo-b", async () => {
    const client = createClient(url!, anonKey!, {
      global: { headers: { Authorization: `Bearer ${tokenA}` } },
    });
    const { data, error } = await client
      .from("properties")
      .select("id")
      .eq("organization_id", "22222222-2222-2222-2222-222222222222");

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("demo-a no puede falsificar un análisis como completed", async () => {
    const client = createClient(url!, anonKey!, {
      global: { headers: { Authorization: `Bearer ${tokenA}` } },
    });

    const { data: property, error: propErr } = await client
      .from("properties")
      .select("id, organization_id")
      .eq("organization_id", "11111111-1111-1111-1111-111111111111")
      .limit(1)
      .single();

    expect(propErr).toBeNull();
    expect(property).not.toBeNull();

    const documentId = randomUUID();
    const orgId = property!.organization_id;

    const { data: pending, error: docErr } = await client.rpc(
      "create_pending_document",
      {
        p_document_id: documentId,
        p_organization_id: orgId,
        p_property_id: property!.id,
        p_storage_path: `${orgId}/${property!.id}/${documentId}.pdf`,
        p_filename: "rls-test.pdf",
        p_mime_type: "application/pdf",
        p_idempotency_key: `rls-${randomUUID()}`,
        p_daily_limit: 0,
      },
    );
    expect(docErr).toBeNull();
    expect(pending).toBeTruthy();
    const analysisId = (Array.isArray(pending) ? pending[0] : pending)
      ?.analysis_id as string;
    expect(analysisId).toBeTruthy();

    const { error: updErr } = await client
      .from("document_analyses")
      .update({
        status: "completed",
        risk_level: "low",
        solvency_score: 99,
        completed_at: new Date().toISOString(),
      })
      .eq("id", analysisId);

    expect(updErr).not.toBeNull();

    await client.from("documents").delete().eq("id", documentId);
  });

  it("demo-a no puede insertar análisis con status completed", async () => {
    const client = createClient(url!, anonKey!, {
      global: { headers: { Authorization: `Bearer ${tokenA}` } },
    });

    const { data: property } = await client
      .from("properties")
      .select("id, organization_id")
      .eq("organization_id", "11111111-1111-1111-1111-111111111111")
      .limit(1)
      .single();

    const documentId = randomUUID();
    const orgId = property!.organization_id;

    const { data: pending, error: docErr } = await client.rpc(
      "create_pending_document",
      {
        p_document_id: documentId,
        p_organization_id: orgId,
        p_property_id: property!.id,
        p_storage_path: `${orgId}/${property!.id}/${documentId}.pdf`,
        p_filename: "rls-test.pdf",
        p_mime_type: "application/pdf",
        p_idempotency_key: `rls-completed-${randomUUID()}`,
        p_daily_limit: 0,
      },
    );
    expect(docErr).toBeNull();
    expect(pending).toBeTruthy();

    const { error: insErr } = await client.from("document_analyses").insert({
      id: randomUUID(),
      document_id: documentId,
      organization_id: orgId,
      status: "completed",
      risk_level: "low",
      solvency_score: 100,
    });

    expect(insErr).not.toBeNull();

    await client.from("documents").delete().eq("id", documentId);
  });

  it("demo-a no puede insertar documento en org ajena", async () => {
    const clientA = createClient(url!, anonKey!, {
      global: { headers: { Authorization: `Bearer ${tokenA}` } },
    });
    const clientB = createClient(url!, anonKey!, {
      global: { headers: { Authorization: `Bearer ${tokenB}` } },
    });

    const { data: propB } = await clientB
      .from("properties")
      .select("id")
      .eq("organization_id", "22222222-2222-2222-2222-222222222222")
      .limit(1)
      .single();

    const { error } = await clientA.from("documents").insert({
      id: randomUUID(),
      organization_id: "22222222-2222-2222-2222-222222222222",
      property_id: propB!.id,
      storage_path: "22222222-2222-2222-2222-222222222222/fake/test.pdf",
      filename: "evil.pdf",
      mime_type: "application/pdf",
    });

    expect(error).not.toBeNull();
  });
  },
);
