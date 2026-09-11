import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "./error-handler.js";

describe("errorHandler", () => {
  it("no expone detalles crudos de proveedores y devuelve correlation id", () => {
    const json = vi.fn();
    const res = {
      status: vi.fn(() => ({ json })),
    };
    const error = new Error(
      ["SUPABASE_SERVICE_ROLE_KEY", "=secret-value"].join(""),
    );
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    errorHandler(
      error,
      { requestId: "request-123" } as never,
      res as never,
      vi.fn(),
    );

    expect(json).toHaveBeenCalledWith({
      error: {
        code: "INTERNAL_ERROR",
        message: "Error interno del servidor",
        request_id: "request-123",
      },
    });
    expect(JSON.stringify(json.mock.calls)).not.toContain("secret-value");
    consoleError.mockRestore();
  });
});
