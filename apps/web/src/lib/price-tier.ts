export type PriceTier = "budget" | "mid" | "premium";

export function getPriceTier(priceMonthly: number): PriceTier {
  if (priceMonthly < 1000) return "budget";
  if (priceMonthly <= 1500) return "mid";
  return "premium";
}

export const priceTierMarkerColor: Record<PriceTier, string> = {
  budget: "#5757f8",
  mid: "#f59e0b",
  premium: "#22c55e",
};

export const priceTierLabels: Record<PriceTier, string> = {
  budget: "Económico (<1.000 €)",
  mid: "Medio (1.000–1.500 €)",
  premium: "Premium (>1.500 €)",
};
