import { describe, expect, it } from "vitest";
import { formatMonthlyPrice } from "./format";

describe("formatMonthlyPrice", () => {
  it("no agrupa cifras de 4 dígitos (es-ES)", () => {
    expect(formatMonthlyPrice(1200)).toBe("1200 €/mes");
  });

  it("agrupa desde 5 dígitos", () => {
    expect(formatMonthlyPrice(12000)).toBe("12.000 €/mes");
  });

  it("no contiene espacios separables", () => {
    expect(formatMonthlyPrice(950)).not.toMatch(/ /);
  });
});
