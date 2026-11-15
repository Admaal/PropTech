import { describe, expect, it } from "vitest";
import { isValidInternalKey } from "./internal-auth.js";

describe("isValidInternalKey", () => {
  const expected = "k".repeat(40);

  it("acepta la clave correcta", () => {
    expect(isValidInternalKey(expected, expected)).toBe(true);
  });

  it("rechaza una clave incorrecta de la misma longitud", () => {
    expect(isValidInternalKey("x".repeat(40), expected)).toBe(false);
  });

  it("rechaza una clave de otra longitud", () => {
    expect(isValidInternalKey("k", expected)).toBe(false);
  });

  it("rechaza clave ausente o repetida como array", () => {
    expect(isValidInternalKey(undefined, expected)).toBe(false);
    expect(isValidInternalKey([expected, expected], expected)).toBe(false);
  });
});
