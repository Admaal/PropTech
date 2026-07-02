import { fetchProperties } from "@/lib/api";
import { requireAuth } from "@/lib/auth-server";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { ApiRetryPanel } from "@/components/api-retry-panel";
import { DashboardView } from "@/components/dashboard-view";
import { AppShell } from "@/components/app-shell";

export default async function DashboardPage() {
  const { supabase, accessToken } = await requireAuth();

  let properties: Awaited<ReturnType<typeof fetchProperties>>["data"] = [];
  let total = 0;
  let error: string | null = null;
  const admin = await isPlatformAdmin(supabase);

  try {
    const result = await fetchProperties(accessToken, { limit: "100" });
    properties = result.data;
    total = result.total;
  } catch (e) {
    error = e instanceof Error ? e.message : "Error desconocido";
  }

  return (
    <AppShell
      title="Mis propiedades"
      subtitle="Explora el mapa y filtra por precio, superficie y riesgo"
      showAdminLink={admin}
    >
      {error ? (
        <ApiRetryPanel />
      ) : (
        <DashboardView
          accessToken={accessToken}
          initialProperties={properties}
          initialTotal={total}
        />
      )}
    </AppShell>
  );
}
