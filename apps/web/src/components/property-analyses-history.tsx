"use client";

import { useCallback, useEffect, useState } from "react";
import type { DocumentAnalysisWithFilename, RiskLevel } from "@proptech/shared";
import { fetchAnalyses } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { AnalysisPanel } from "@/components/analysis-panel";
import { riskBadgeClasses } from "@/lib/ui-styles";

const statusLabels: Record<string, string> = {
  pending: "En cola",
  processing: "Procesando",
  completed: "Completado",
  failed: "Fallido",
};

const riskLabels: Record<RiskLevel, string> = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface PropertyAnalysesHistoryProps {
  propertyId: string;
  initialAnalyses?: DocumentAnalysisWithFilename[];
  refreshKey?: number;
}

export function PropertyAnalysesHistory({
  propertyId,
  initialAnalyses = [],
  refreshKey = 0,
}: PropertyAnalysesHistoryProps) {
  const [analyses, setAnalyses] =
    useState<DocumentAnalysisWithFilename[]>(initialAnalyses);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const data = await fetchAnalyses(session.access_token, propertyId);
      setAnalyses(data);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    if (refreshKey === 0 && initialAnalyses.length > 0) return;
    void load();
  }, [propertyId, refreshKey, load, initialAnalyses.length]);

  return (
    <section className="mt-8 border-t border-border pt-8">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium">Historial de análisis</h3>
        {loading && (
          <span className="text-xs text-muted-foreground">Actualizando…</span>
        )}
      </div>

      {analyses.length === 0 ? (
        <p className="rounded-lg border border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
          Aún no hay análisis para este inmueble. Sube un PDF arriba para
          empezar.
        </p>
      ) : (
        <ul className="space-y-3">
          {analyses.map((a) => {
            const expanded = expandedId === a.id;
            return (
              <li
                key={a.id}
                className="overflow-hidden rounded-lg border border-border bg-card"
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : a.id)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm hover:bg-muted/30"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {a.filename ?? "Documento PDF"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(a.created_at)} · {statusLabels[a.status]}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {a.risk_level && (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs ${riskBadgeClasses[a.risk_level]}`}
                      >
                        {riskLabels[a.risk_level]}
                      </span>
                    )}
                    {a.solvency_score != null && (
                      <span className="text-xs font-medium">
                        {a.solvency_score}/100
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      {expanded ? "▲" : "▼"}
                    </span>
                  </div>
                </button>
                {expanded && (
                  <div className="border-t border-border p-4">
                    <AnalysisPanel analysisId={a.id} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
