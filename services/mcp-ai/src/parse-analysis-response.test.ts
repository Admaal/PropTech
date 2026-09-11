import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { parseGeminiAnalysisJson } from "./parse-analysis-response.js";

const validPayload = {
  solvency_score: 85,
  risk_level: "low",
  extracted_data: {
    monthly_income: 3200,
    employer: "Tech Corp",
    anomalies: [],
  },
  report_markdown: "Perfil solvente con ingresos estables.",
};

describe("parseGeminiAnalysisJson", () => {
  it("parsea JSON válido de Gemini", () => {
    const result = parseGeminiAnalysisJson(JSON.stringify(validPayload));
    expect(result.risk_level).toBe("low");
    expect(result.solvency_score).toBe(85);
  });

  it("normaliza nulls típicos de Gemini en extracted_data", () => {
    const result = parseGeminiAnalysisJson(
      JSON.stringify({
        ...validPayload,
        extracted_data: {
          monthly_income: null,
          employer: null,
          contract_type: null,
          anomalies: null,
        },
      }),
    );
    expect(result.extracted_data.monthly_income).toBeUndefined();
    expect(result.extracted_data.anomalies).toEqual([]);
  });

  it("rechaza JSON malformado", () => {
    expect(() => parseGeminiAnalysisJson("{ not json")).toThrow(SyntaxError);
  });

  it("rechaza respuesta IA incompleta", () => {
    try {
      parseGeminiAnalysisJson(JSON.stringify({ solvency_score: 50 }));
      expect.fail("debía lanzar ZodError");
    } catch (err) {
      expect(err).toBeInstanceOf(ZodError);
    }
  });

  it("rechaza risk_level inventado por el modelo", () => {
    expect(() =>
      parseGeminiAnalysisJson(
        JSON.stringify({ ...validPayload, risk_level: "unknown" }),
      ),
    ).toThrow(ZodError);
  });
});
