import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const demoPassword = process.env.DEMO_USER_PASSWORD;

const hasCredentials = Boolean(url && anonKey && demoPassword);

describe.skipIf(!hasCredentials)("RLS — aislamiento cross-org", () => {
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
});
