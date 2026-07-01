"use client";

import Link from "next/link";
import type { DocumentAnalysisWithFilename, RiskLevel } from "@proptech/shared";
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

interface AnalysesListProps {
  analyses: DocumentAnalysisWithFilename[];
}

export function AnalysesList({ analyses }: AnalysesListProps) {
  if (analyses.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground">
          Aún no hay análisis. Sube un PDF desde el detalle de una propiedad.
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          Ir al listado
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-6 py-3 font-medium">Documento</th>
            <th className="px-6 py-3 font-medium">Estado</th>
            <th className="px-6 py-3 font-medium">Riesgo</th>
            <th className="px-6 py-3 font-medium">Solvencia</th>
            <th className="px-6 py-3 font-medium">Duración</th>
            <th className="px-6 py-3 font-medium">Tokens</th>
          </tr>
        </thead>
        <tbody>
          {analyses.map((a) => (
            <tr
              key={a.id}
              className="border-b border-border/50 last:border-0"
            >
              <td className="px-6 py-4">
                {a.filename ?? a.document_id.slice(0, 8)}
              </td>
              <td className="px-6 py-4">{statusLabels[a.status]}</td>
              <td className="px-6 py-4">
                {a.risk_level ? riskLabels[a.risk_level] : "—"}
              </td>
              <td className="px-6 py-4">
                {a.solvency_score != null ? `${a.solvency_score}/100` : "—"}
              </td>
              <td className="px-6 py-4">
                {a.duration_ms != null
                  ? `${(a.duration_ms / 1000).toFixed(1)}s`
                  : "—"}
              </td>
              <td className="px-6 py-4">{a.tokens_used ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
