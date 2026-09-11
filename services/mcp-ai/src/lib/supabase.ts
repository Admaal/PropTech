import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parseMcpConfig } from "../runtime-config.js";

const runtimeConfig = parseMcpConfig(process.env);

export function createServiceClient(): SupabaseClient {
  return createClient(
    runtimeConfig.supabaseUrl,
    runtimeConfig.supabaseServiceRoleKey,
    {
    auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
