import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type AuthenticatedSession = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User;
  accessToken: string;
};

/** Valida JWT con Supabase Auth (getUser) y devuelve access token para el API. */
export async function requireAuth(): Promise<AuthenticatedSession> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    redirect("/login");
  }

  return { supabase, user, accessToken: session.access_token };
}
