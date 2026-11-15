export function formatMonthlyPrice(price: number): string {
  return `${price.toLocaleString("es-ES")} €/mes`;
}
