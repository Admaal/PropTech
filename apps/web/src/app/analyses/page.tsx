import { fetchAnalyses } from "@/lib/api";
import { requireAuth } from "@/lib/auth-server";
import { AppShell } from "@/components/app-shell";
import { AnalysesList } from "@/components/analyses-list";

export default async function AnalysesPage() {
  const { accessToken } = await requireAuth();

  let analyses: Awaited<ReturnType<typeof fetchAnalyses>> = [];
  let error: string | null = null;

  try {
    analyses = await fetchAnalyses(accessToken);
  } catch (e) {
    error = e instanceof Error ? e.message : "Error desconocido";
  }

  return (
    <AppShell
      title="Historial de análisis"
      subtitle="Documentos procesados por IA (Gemini vía MCP)"
      backHref="/dashboard"
      backLabel="← Volver a propiedades"
    >
      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-6 text-sm text-red-800">
          {error}
        </div>
      ) : (
        <AnalysesList analyses={analyses} />
      )}
    </AppShell>
  );
}
