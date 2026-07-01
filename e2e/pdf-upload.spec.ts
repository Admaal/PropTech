import { test, expect } from "@playwright/test";
import path from "node:path";

const samplePdf = path.join(process.cwd(), "e2e", "fixtures", "sample.pdf");
const demoPassword = process.env.DEMO_USER_PASSWORD ?? "";

test.beforeEach(({}, testInfo) => {
  test.skip(
    !demoPassword,
    "Define DEMO_USER_PASSWORD para ejecutar el E2E de login + PDF",
  );
  test.skip(
    testInfo.project.name !== "chromium",
    "Flujo E2E solo en Chromium",
  );
});

test("login demo → subir PDF → ver análisis completado", async ({ page }) => {
  await page.goto("/login");

  await page
    .getByRole("button", { name: /Demo A — Inmobiliaria Centro/i })
    .click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

  const firstProperty = page.locator('a[href^="/properties/"]').first();
  await expect(firstProperty).toBeVisible({ timeout: 15_000 });
  await firstProperty.click();

  await expect(page).toHaveURL(/\/properties\//, { timeout: 15_000 });

  await page
    .getByRole("heading", { name: "Documentación del inquilino" })
    .scrollIntoViewIfNeeded();

  const fileInput = page.locator('input[type="file"][accept="application/pdf"]');
  await fileInput.setInputFiles(samplePdf, { force: true });

  await expect(
    page.getByText(/Documento recibido|Analizando con IA|Análisis completado/i),
  ).toBeVisible({ timeout: 30_000 });

  const historyToggle = page
    .locator("section")
    .filter({ hasText: "Historial de análisis" })
    .getByRole("button")
    .first();

  try {
    await expect(
      page.getByText(/Análisis completado/i).first(),
    ).toBeVisible({ timeout: 120_000 });
  } catch {
    if (await historyToggle.isVisible()) {
      await historyToggle.click();
    }
    await expect(
      page.getByText(/Completado|Resultado del análisis/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  }
});
