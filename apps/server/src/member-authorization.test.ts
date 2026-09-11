import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, beforeAll, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const memberEmail =
  process.env.MEMBER_USER_EMAIL ?? "demo-member@test.com";
const memberPassword =
  process.env.MEMBER_USER_PASSWORD ?? process.env.DEMO_USER_PASSWORD;
const memberOrganizationId =
  process.env.MEMBER_ORGANIZATION_ID ??
  "11111111-1111-1111-1111-111111111111";
const shouldRun = Boolean(
  process.env.RUN_SUPABASE_INTEGRATION === "true" &&
    url &&
    anonKey &&
    memberEmail &&
    memberPassword &&
    memberOrganizationId,
);
const protectedMain =
  process.env.CI === "true" &&
  process.env.GITHUB_EVENT_NAME === "push" &&
  (process.env.GITHUB_REF === "refs/heads/main" ||
    process.env.GITHUB_REF === "refs/heads/master");

function missingMemberGateEnv(): string[] {
  const missing: string[] = [];
  if (process.env.RUN_SUPABASE_INTEGRATION !== "true") {
    missing.push("RUN_SUPABASE_INTEGRATION");
  }
  if (!url) missing.push("SUPABASE_URL");
  if (!anonKey) missing.push("SUPABASE_ANON_KEY");
  if (!memberPassword) missing.push("DEMO_USER_PASSWORD");
  return missing;
}

describe("RLS — configuración member", () => {
  it("requiere identidad member configurada en main", () => {
    if (!protectedMain) return;
    expect(
      shouldRun,
      `Faltan env vars de integración (nombres, no valores): ${
        missingMemberGateEnv().join(", ") || "desconocido"
      }`,
    ).toBe(true);
  });
});

describe.skipIf(!shouldRun)("RLS — permisos negativos de member", () => {
  let client: SupabaseClient;

  beforeAll(async () => {
    const authClient = createClient(url!, anonKey!);
    const { data, error } = await authClient.auth.signInWithPassword({
      email: memberEmail!,
      password: memberPassword!,
    });

    if (error || !data.session) {
      throw new Error(`Login member falló: ${error?.message ?? "sin sesión"}`);
    }

    client = createClient(url!, anonKey!, {
      global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    });
  });

  it("member puede consultar su org pero no modificar ni borrar propiedades", async () => {
    const { data: property, error: selectError } = await client
      .from("properties")
      .select("id, title")
      .eq("organization_id", memberOrganizationId!)
      .limit(1)
      .single();

    expect(selectError).toBeNull();
    expect(property).not.toBeNull();

    const attemptedTitle = `forbidden-${Date.now()}`;
    const { data: updated, error: updateError } = await client
      .from("properties")
      .update({ title: attemptedTitle })
      .eq("id", property!.id)
      .select("id");

    expect(updateError).toBeNull();
    expect(updated).toEqual([]);

    const { data: afterUpdate } = await client
      .from("properties")
      .select("title")
      .eq("id", property!.id)
      .single();
    expect(afterUpdate?.title).toBe(property!.title);

    const { data: deleted, error: deleteError } = await client
      .from("properties")
      .delete()
      .eq("id", property!.id)
      .select("id");

    expect(deleteError).toBeNull();
    expect(deleted).toEqual([]);
  });
});
