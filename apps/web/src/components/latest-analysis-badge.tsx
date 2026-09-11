import type { LatestAnalysisSummary, RiskLevel } from "@proptech/shared";
import { riskBadgeClasses } from "@/lib/ui-styles";

const riskLabels: Record<RiskLevel, string> = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
};

interface LatestAnalysisBadgeProps {
  analysis: LatestAnalysisSummary;
  className?: string;
}

export function LatestAnalysisBadge({
  analysis,
  className = "",
}: LatestAnalysisBadgeProps) {
  if (!analysis.risk_level && analysis.solvency_score == null) {
    return null;
  }

  const risk = analysis.risk_level;
  const score =
    analysis.solvency_score != null ? `${analysis.solvency_score}/100` : null;

  return (
    <span
      className={`inline-flex shrink-0 flex-col items-end gap-0.5 text-right ${className}`}
      title="Última evaluación IA de un candidato"
    >
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Última evaluación IA
      </span>
      <span className="flex items-center gap-1.5">
        {risk && (
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-medium ${riskBadgeClasses[risk]}`}
          >
            Riesgo {riskLabels[risk]}
          </span>
        )}
        {score && (
          <span className="text-xs font-medium text-foreground">{score}</span>
        )}
      </span>
    </span>
  );
}
