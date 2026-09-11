import { fetchProperties } from "@/lib/api";
import { requireAuth } from "@/lib/auth-server";
import { ApiRetryPanel } from "@/components/api-retry-panel";
import { DashboardView } from "@/components/dashboard-view";
import { PageHeader } from "@/components/page-header";

export default async function DashboardPage() {
  const { accessToken } = await requireAuth();

  let properties: Awaited<ReturnType<typeof fetchProperties>>["data"] = [];
  let total = 0;
  let error: string | null = null;

  try {
    const result = await fetchProperties(accessToken, { limit: "100" });
    properties = result.data;
    total = result.total;
  } catch (e) {
    error = e instanceof Error ? e.message : "Error desconocido";
  }

  return (
    <>
      <PageHeader
        title="Mis propiedades"
        subtitle="Explora el mapa y filtra por precio, superficie y riesgo"
      />
      {error ? (
        <ApiRetryPanel />
      ) : (
        <DashboardView
          accessToken={accessToken}
          initialProperties={properties}
          initialTotal={total}
        />
      )}
    </>
  );
}
