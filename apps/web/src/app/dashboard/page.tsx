import { fetchProperties } from "@/lib/api";
import { requireAuth } from "@/lib/auth-server";
import { isPlatformAdmin } from "@/lib/platform-admin";
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
        <div className="rounded-lg border border-red-300 bg-red-50 p-6 text-sm text-red-800">
          {error}
          <p className="mt-2 text-muted-foreground">
            Verifica que el servidor esté en marcha y las variables de entorno
            configuradas.
          </p>
        </div>
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
