import { describe, expect, it } from "vitest";
import {
  AnalysisResultSchema,
  AnalyzeJobSchema,
  PropertyFiltersSchema,
} from "./schemas.js";

describe("AnalysisResultSchema", () => {
  const valid = {
    solvency_score: 72,
    risk_level: "medium" as const,
    extracted_data: {
      monthly_income: 2400,
      employer: "Acme SL",
      contract_type: "indefinido",
      anomalies: ["Documento parcialmente ilegible"],
    },
    report_markdown: "Informe de solvencia favorable con reservas.",
  };

  it("acepta una respuesta IA válida", () => {
    const result = AnalysisResultSchema.parse(valid);
    expect(result.solvency_score).toBe(72);
    expect(result.risk_level).toBe("medium");
  });

  it("normaliza null en campos opcionales de extracted_data", () => {
    const result = AnalysisResultSchema.parse({
      ...valid,
      extracted_data: {
        monthly_income: null,
        employer: null,
        contract_type: null,
        anomalies: null,
      },
    });
    expect(result.extracted_data.monthly_income).toBeUndefined();
    expect(result.extracted_data.employer).toBeUndefined();
    expect(result.extracted_data.anomalies).toEqual([]);
  });

  it("rechaza solvency_score fuera de rango", () => {
    expect(() =>
      AnalysisResultSchema.parse({ ...valid, solvency_score: 101 }),
    ).toThrow();
    expect(() =>
      AnalysisResultSchema.parse({ ...valid, solvency_score: -1 }),
    ).toThrow();
  });

  it("rechaza risk_level inválido", () => {
    expect(() =>
      AnalysisResultSchema.parse({ ...valid, risk_level: "critical" }),
    ).toThrow();
  });

  it("rechaza respuesta sin report_markdown", () => {
    const { report_markdown: _, ...incomplete } = valid;
    expect(() => AnalysisResultSchema.parse(incomplete)).toThrow();
  });
});

describe("PropertyFiltersSchema", () => {
  it("aplica defaults de paginación", () => {
    const result = PropertyFiltersSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it("valida bbox con cuatro coordenadas", () => {
    expect(() =>
      PropertyFiltersSchema.parse({ bbox: "40.4,-3.7,40.5,-3.6" }),
    ).not.toThrow();
    expect(() =>
      PropertyFiltersSchema.parse({ bbox: "invalid" }),
    ).toThrow();
  });

  it("limita limit a 100", () => {
    expect(() => PropertyFiltersSchema.parse({ limit: 101 })).toThrow();
  });
});

describe("AnalyzeJobSchema", () => {
  it("requiere UUIDs en el job de análisis", () => {
    expect(() =>
      AnalyzeJobSchema.parse({
        analysisId: "not-a-uuid",
        documentId: "22222222-2222-2222-2222-222222222222",
        storagePath: "org/prop/doc.pdf",
        organizationId: "11111111-1111-1111-1111-111111111111",
      }),
    ).toThrow();
  });
});
