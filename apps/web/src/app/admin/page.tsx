import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { AppShell } from "@/components/app-shell";
import { AdminPanel } from "@/components/admin-panel";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const admin = await isPlatformAdmin(supabase);
  if (!admin) {
    redirect("/dashboard");
  }

  return (
    <AppShell
      title="Administración"
      subtitle="Gestión cross-org (platform admin)"
      backHref="/dashboard"
      backLabel="← Volver al dashboard"
      showAdminLink={false}
    >
      <AdminPanel />
    </AppShell>
  );
}
