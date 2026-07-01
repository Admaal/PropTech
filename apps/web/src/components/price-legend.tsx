import {
  priceTierLabels,
  priceTierMarkerColor,
  type PriceTier,
} from "@/lib/price-tier";

const tiers: PriceTier[] = ["budget", "mid", "premium"];

interface PriceLegendProps {
  compact?: boolean;
}

export function PriceLegend({ compact }: PriceLegendProps) {
  return (
    <div
      className={`flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground ${compact ? "" : "px-4 py-2"}`}
    >
      {tiers.map((tier) => (
        <span key={tier} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: priceTierMarkerColor[tier] }}
          />
          <span>{priceTierLabels[tier]}</span>
        </span>
      ))}
      {!compact && (
        <span className="text-muted-foreground/80">
          · color del marcador según alquiler mensual
        </span>
      )}
    </div>
  );
}
