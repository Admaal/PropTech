import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverConfig } from "./config.js";

if (!serverConfig.supabaseUrl || !serverConfig.supabaseAnonKey) {
  throw new Error("SUPABASE_URL y SUPABASE_ANON_KEY son obligatorios");
}

const { supabaseUrl: url, supabaseAnonKey: anonKey } = serverConfig;

export function createUserClient(accessToken: string): SupabaseClient {
  return createClient(url, anonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
