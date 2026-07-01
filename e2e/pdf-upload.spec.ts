import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

const samplePdf = path.join(process.cwd(), "e2e", "fixtures", "sample.pdf");
const demoPassword = process.env.DEMO_USER_PASSWORD ?? "";

/** demo-b primero: demo-a suele agotar la cuota de 3 análisis/día en CI. */
const DEMO_EMAILS = ["demo-b@test.com", "demo-a@test.com"] as const;

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

async function loginDemo(page: Page, email: string) {
  await page.goto("/login");
  await page.getByText("Iniciar sesión manualmente").click();
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(demoPassword);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await expect(page.getByText(/\d+ inmuebles? encontrados/)).toBeVisible({
    timeout: 30_000,
  });
}

async function openFirstProperty(page: Page) {
  const firstProperty = page.locator('a[href^="/properties/"]').first();
  await expect(firstProperty).toBeVisible({ timeout: 15_000 });
  await firstProperty.click();
  await expect(page).toHaveURL(/\/properties\//, { timeout: 15_000 });
  await page
    .getByRole("heading", { name: "Documentación del inquilino" })
    .scrollIntoViewIfNeeded();
}

async function uploadSamplePdf(page: Page) {
  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByText("Seleccionar archivo").click(),
  ]);
  await fileChooser.setFiles(samplePdf);
}

test("login demo → subir PDF → ver análisis completado", async ({ page }) => {
  let uploadAccepted = false;

  for (const email of DEMO_EMAILS) {
    await loginDemo(page, email);
    await openFirstProperty(page);

    const uploadResponse = page.waitForResponse(
      (res) =>
        res.url().includes("/api/v1/documents") &&
        res.request().method() === "POST",
      { timeout: 60_000 },
    );

    await uploadSamplePdf(page);
    const response = await uploadResponse;

    if (response.status() === 429) {
      continue;
    }

    expect(
      response.ok(),
      `Upload falló (${response.status()}) con ${email}`,
    ).toBe(true);
    uploadAccepted = true;
    break;
  }

  expect(
    uploadAccepted,
    "Ninguna cuenta demo tiene cuota disponible (3 análisis/día por organización)",
  ).toBe(true);

  await expect(
    page.getByText(
      /Documento recibido|Subiendo PDF|Analizando con IA|Análisis completado/i,
    ),
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
