import { describe, expect, it } from "vitest";
import { resolveRequestId } from "./request-id.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("resolveRequestId", () => {
  it("conserva un ID válido recibido del server", () => {
    expect(resolveRequestId("abc-123_x.y")).toBe("abc-123_x.y");
  });

  it("genera un UUID cuando la cabecera falta", () => {
    expect(resolveRequestId(undefined)).toMatch(UUID_PATTERN);
  });

  it("rechaza saltos de línea y espacios para no contaminar los logs", () => {
    const id = resolveRequestId("bien\nmal espacio");
    expect(id).not.toContain("\n");
    expect(id).toMatch(UUID_PATTERN);
  });

  it("rechaza IDs de más de 64 caracteres", () => {
    expect(resolveRequestId("a".repeat(65))).toMatch(UUID_PATTERN);
  });
});
