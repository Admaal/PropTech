import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-server";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { PageHeader } from "@/components/page-header";
import { AdminPanel } from "@/components/admin-panel";

export default async function AdminPage() {
  const { supabase } = await requireAuth();

  const admin = await isPlatformAdmin(supabase);
  if (!admin) {
    redirect("/dashboard");
  }

  return (
    <>
      <PageHeader
        title="Administración"
        subtitle="Gestión cross-org (platform admin)"
        backHref="/dashboard"
        backLabel="← Volver al dashboard"
      />
      <AdminPanel />
    </>
  );
}
