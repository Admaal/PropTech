import { test, expect } from "@playwright/test";
import path from "node:path";
import {
  expectDashboardWithProperties,
  loginManual,
  openFirstProperty,
  scrollToDocumentsSection,
} from "./helpers/demo-login";

const samplePdf = path.join(process.cwd(), "e2e", "fixtures", "sample.pdf");

const adminEmail =
  process.env.E2E_ADMIN_EMAIL ?? process.env.PLATFORM_ADMIN_EMAIL ?? "admin@test.com";
const adminPassword =
  process.env.PLATFORM_ADMIN_PASSWORD ?? process.env.DEMO_USER_PASSWORD ?? "";

test.beforeEach(({}, testInfo) => {
  test.skip(
    !adminPassword,
    "Define PLATFORM_ADMIN_PASSWORD para E2E full-stack",
  );
  test.skip(testInfo.project.name !== "chromium", "Full-stack solo en Chromium");
});

test(
  "admin → subir PDF real → IA completada",
  { tag: "@full-stack" },
  async ({ page }) => {
    await loginManual(page, adminEmail, adminPassword);
    await expectDashboardWithProperties(page);
    await openFirstProperty(page);
    await scrollToDocumentsSection(page);

    const uploadResponse = page.waitForResponse(
      (res) =>
        res.url().includes("/api/v1/documents") &&
        res.request().method() === "POST",
      { timeout: 60_000 },
    );

    const [fileChooser] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.getByText("Seleccionar archivo").click(),
    ]);
    await fileChooser.setFiles(samplePdf);

    const response = await uploadResponse;
    expect(response.ok(), `Upload falló (${response.status()})`).toBe(true);

    await expect(
      page.getByText(/Documento recibido|Analizando con IA/i),
    ).toBeVisible({ timeout: 30_000 });

    const historyToggle = page
      .locator("section")
      .filter({ hasText: "Historial de análisis" })
      .getByRole("button")
      .first();

    try {
      await expect(
        page.getByText(/Análisis completado/i).first(),
      ).toBeVisible({ timeout: 180_000 });
    } catch {
      if (await historyToggle.isVisible()) {
        await historyToggle.click();
      }
      await expect(
        page.getByText(/Completado|Resultado del análisis/i).first(),
      ).toBeVisible({ timeout: 15_000 });
    }
  },
);
