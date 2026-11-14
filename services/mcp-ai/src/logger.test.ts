import { afterEach, describe, expect, it, vi } from "vitest";
import { logEvent } from "./logger.js";

describe("logEvent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emite una línea JSON con nivel, mensaje y requestId", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    logEvent("info", "análisis iniciado", {
      service: "mcp-ai",
      requestId: "req-123",
      analysisId: "an-1",
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const line = JSON.parse(String(spy.mock.calls[0]?.[0]));
    expect(line).toMatchObject({
      level: "info",
      msg: "análisis iniciado",
      service: "mcp-ai",
      requestId: "req-123",
      analysisId: "an-1",
    });
    expect(typeof line.time).toBe("string");
  });

  it("no escribe campos fuera de la lista permitida, como rutas de fichero", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    logEvent("warn", "reintento", {
      service: "mcp-ai",
      requestId: "req-123",
      storagePath: "org-1/prop-1/doc-1.pdf",
    } as Parameters<typeof logEvent>[2]);

    const line = JSON.parse(String(spy.mock.calls[0]?.[0]));
    expect(line).not.toHaveProperty("storagePath");
  });
});
