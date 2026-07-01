"use client";

import { useCallback, useEffect, useState } from "react";
import type { DocumentAnalysis, RiskLevel } from "@proptech/shared";
import { fetchAnalysis } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

import { alertErrorClasses, riskBadgeClasses } from "@/lib/ui-styles";

const riskLabels: Record<RiskLevel, string> = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
};

const riskBarColors: Record<RiskLevel, string> = {
  low: "bg-green-500",
  medium: "bg-amber-500",
  high: "bg-red-500",
};

const riskBadgeColors = riskBadgeClasses;

interface AnalysisPanelProps {
  analysisId: string;
}

export function AnalysisPanel({ analysisId }: AnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const poll = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const data = await fetchAnalysis(session.access_token, analysisId);
      setAnalysis(data);
      setError(null);
      return data.status;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar análisis");
      return "failed" as const;
    }
  }, [analysisId]);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      const status = await poll();
      if (!active) return;
      if (status === "pending" || status === "processing") {
        timer = setTimeout(tick, 2000);
      }
    };

    void tick();

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [poll]);

  if (error) {
    return (
      <div className={`p-4 text-sm ${alertErrorClasses}`}>
        {error}
      </div>
    );
  }

  if (!analysis || analysis.status === "pending" || analysis.status === "processing") {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-3 flex items-center gap-3">
          <div className="h-4 w-4 animate-pulse rounded-full bg-primary" />
          <p className="text-sm font-medium">
            {analysis?.status === "processing"
              ? "Analizando documento con IA…"
              : "En cola de análisis…"}
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
        </div>
      </div>
    );
  }

  if (analysis.status === "failed") {
    return (
      <div className={`p-4 text-sm ${alertErrorClasses}`}>
        <p className="font-medium">El análisis ha fallado</p>
        <p className="mt-1">{analysis.error_message ?? "Error desconocido"}</p>
      </div>
    );
  }

  const score = analysis.solvency_score ?? 0;
  const risk = analysis.risk_level ?? "medium";

  return (
    <div className="space-y-6 rounded-lg border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium">Resultado del análisis</h3>
          {analysis.duration_ms != null && (
            <p className="mt-1 text-xs text-muted-foreground">
              Procesado en {(analysis.duration_ms / 1000).toFixed(1)}s
              {analysis.tokens_used != null &&
                ` · ${analysis.tokens_used} tokens`}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${riskBadgeColors[risk]}`}
        >
          Riesgo {riskLabels[risk]}
        </span>
      </div>

      <div>
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-muted-foreground">Solvencia</span>
          <span className="font-medium">{score}/100</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${riskBarColors[risk]}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {analysis.extracted_data && (
        <dl className="grid grid-cols-2 gap-4 text-sm">
          {analysis.extracted_data.monthly_income != null && (
            <div>
              <dt className="text-muted-foreground">Ingresos mensuales</dt>
              <dd className="font-medium">
                {analysis.extracted_data.monthly_income.toLocaleString("es-ES")}{" "}
                €
              </dd>
            </div>
          )}
          {analysis.extracted_data.employer && (
            <div>
              <dt className="text-muted-foreground">Empleador</dt>
              <dd className="font-medium">{analysis.extracted_data.employer}</dd>
            </div>
          )}
          {analysis.extracted_data.contract_type && (
            <div>
              <dt className="text-muted-foreground">Tipo de contrato</dt>
              <dd className="font-medium">
                {analysis.extracted_data.contract_type}
              </dd>
            </div>
          )}
        </dl>
      )}

      {analysis.extracted_data?.anomalies &&
        analysis.extracted_data.anomalies.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium">Anomalías detectadas</p>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {analysis.extracted_data.anomalies.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        )}

      {analysis.report_markdown && (
        <div className="border-t border-border pt-4">
          <p className="mb-2 text-sm font-medium">Informe</p>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {analysis.report_markdown}
          </div>
        </div>
      )}
    </div>
  );
}
