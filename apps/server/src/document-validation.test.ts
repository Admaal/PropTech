import { describe, expect, it } from "vitest";
import { isAnalysisQuotaExceeded, isPdfBuffer } from "./lib/pdf-validation.js";
import { sanitizeFilename } from "./lib/sanitize-filename.js";

describe("isPdfBuffer", () => {
  it("acepta un PDF con cabecera válida", () => {
    const buffer = Buffer.from("%PDF-1.4\n%âãÏÓ");
    expect(isPdfBuffer(buffer)).toBe(true);
  });

  it("rechaza un buffer con mimetype PDF falso", () => {
    const buffer = Buffer.from("MZ\x90\x00fake exe");
    expect(isPdfBuffer(buffer)).toBe(false);
  });

  it("rechaza buffers demasiado cortos", () => {
    expect(isPdfBuffer(Buffer.from("%PD"))).toBe(false);
  });
});

describe("sanitizeFilename", () => {
  it("elimina rutas con path traversal", () => {
    expect(sanitizeFilename("../../etc/passwd.pdf")).toBe("passwd.pdf");
    expect(sanitizeFilename("..\\..\\malware.pdf")).toBe("malware.pdf");
  });

  it("sustituye caracteres peligrosos", () => {
    expect(sanitizeFilename('nómina<script>.pdf')).toBe("n_mina_script_.pdf");
  });

  it("añade extensión .pdf si falta", () => {
    expect(sanitizeFilename("contrato")).toBe("contrato.pdf");
  });

  it("usa fallback si el nombre queda vacío", () => {
    expect(sanitizeFilename("...")).toBe("document.pdf");
  });
});

describe("isAnalysisQuotaExceeded", () => {
  it("no limita cuando la cuota es 0", () => {
    expect(isAnalysisQuotaExceeded(100, 0)).toBe(false);
  });

  it("bloquea cuando se alcanza la cuota", () => {
    expect(isAnalysisQuotaExceeded(3, 3)).toBe(true);
    expect(isAnalysisQuotaExceeded(2, 3)).toBe(false);
  });
});
