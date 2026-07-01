"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import { btnSecondaryClasses } from "@/lib/ui-styles";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={btnSecondaryClasses}
    >
      Cerrar sesión
    </button>
  );
}
