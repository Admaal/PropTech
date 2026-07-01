import type { Page } from "@playwright/test";

/** IDs fijos para mocks de red (no existen en la base de datos). */
export const MOCK_ANALYSIS_ID = "e2e00001-0000-4000-8000-000000000001";
export const MOCK_DOCUMENT_ID = "e2e00002-0000-4000-8000-000000000002";
export const MOCK_ORG_ID = "e2e00003-0000-4000-8000-000000000003";

const now = () => new Date().toISOString();

function completedAnalysis() {
  return {
    id: MOCK_ANALYSIS_ID,
    document_id: MOCK_DOCUMENT_ID,
    organization_id: MOCK_ORG_ID,
    status: "completed" as const,
    risk_level: "low" as const,
    solvency_score: 82,
    extracted_data: {
      monthly_income: 2500,
      employer: "E2E Mock Corp",
      contract_type: "indefinido",
      anomalies: [] as string[],
    },
    report_markdown: "Informe generado por mock E2E (sin IA real).",
    tokens_used: 0,
    duration_ms: 1200,
    error_message: null,
    created_at: now(),
    completed_at: now(),
    filename: "sample.pdf",
  };
}

/** Intercepta upload y polling de análisis; cero cuota, cero Gemini, cero persistencia. */
export async function mockAnalysisApi(page: Page) {
  await page.route("**/api/v1/documents", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({
        document: {
          id: MOCK_DOCUMENT_ID,
          organization_id: MOCK_ORG_ID,
          property_id: null,
          filename: "sample.pdf",
          storage_path: "e2e/mock/sample.pdf",
          mime_type: "application/pdf",
          created_at: now(),
        },
        analysis_id: MOCK_ANALYSIS_ID,
      }),
    });
  });

  await page.route(`**/api/v1/analyses/${MOCK_ANALYSIS_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(completedAnalysis()),
    });
  });

  await page.route("**/api/v1/analyses?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [completedAnalysis()] }),
    });
  });
}
