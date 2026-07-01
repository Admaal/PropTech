import { test, expect } from "@playwright/test";
import path from "node:path";
import {
  expectDashboardWithProperties,
  loginManual,
  openFirstProperty,
  scrollToDocumentsSection,
} from "./helpers/demo-login";
import { mockAnalysisApi } from "./helpers/mock-analysis-api";

const samplePdf = path.join(process.cwd(), "e2e", "fixtures", "sample.pdf");
const demoPassword = process.env.DEMO_USER_PASSWORD ?? "";

test.beforeEach(({}, testInfo) => {
  test.skip(!demoPassword, "Define DEMO_USER_PASSWORD para E2E mockeado");
  test.skip(testInfo.project.name !== "chromium", "E2E mockeado solo en Chromium");
});

test("login → subir PDF (mock) → ver análisis completado en UI", async ({
  page,
}) => {
  await mockAnalysisApi(page);

  await loginManual(page, "demo-b@test.com", demoPassword);
  await expectDashboardWithProperties(page);
  await openFirstProperty(page);
  await scrollToDocumentsSection(page);

  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByText("Seleccionar archivo").click(),
  ]);
  await fileChooser.setFiles(samplePdf);

  await expect(
    page.getByText(
      /Documento recibido|Analizando con IA|Análisis completado/i,
    ),
  ).toBeVisible({ timeout: 15_000 });

  await expect(
    page.getByText(/Análisis completado/i).first(),
  ).toBeVisible({ timeout: 30_000 });

  await expect(page.getByText("Resultado del análisis")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText(/Riesgo Bajo/i)).toBeVisible();
});
