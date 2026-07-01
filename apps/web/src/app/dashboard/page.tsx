import { createClient } from "@/lib/supabase/server";
import { fetchProperties } from "@/lib/api";
import { DashboardView } from "@/components/dashboard-view";
import { AppShell } from "@/components/app-shell";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return null;
  }

  let properties: Awaited<ReturnType<typeof fetchProperties>>["data"] = [];
  let total = 0;
  let error: string | null = null;

  try {
    const result = await fetchProperties(session.access_token, { limit: "100" });
    properties = result.data;
    total = result.total;
  } catch (e) {
    error = e instanceof Error ? e.message : "Error desconocido";
  }

  return (
    <AppShell
      title="Mis propiedades"
      subtitle="Explora el mapa y filtra por precio, superficie y riesgo"
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
          accessToken={session.access_token}
          initialProperties={properties}
          initialTotal={total}
        />
      )}
    </AppShell>
  );
}
