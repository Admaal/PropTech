import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-server";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { AppShell } from "@/components/app-shell";
import { AdminPanel } from "@/components/admin-panel";

export default async function AdminPage() {
  const { supabase } = await requireAuth();

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
