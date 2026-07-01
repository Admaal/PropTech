import { test, expect } from "@playwright/test";
import {
  expectDashboardWithProperties,
  loginManual,
  openFirstProperty,
  scrollToDocumentsSection,
} from "./helpers/demo-login";

const demoPassword = process.env.DEMO_USER_PASSWORD ?? "";

test.beforeEach(({}, testInfo) => {
  test.skip(!demoPassword, "Define DEMO_USER_PASSWORD para E2E smoke");
  test.skip(testInfo.project.name !== "chromium", "Smoke solo en Chromium");
});

test("login demo → dashboard → ficha con documentación", async ({ page }) => {
  await loginManual(page, "demo-b@test.com", demoPassword);
  await expectDashboardWithProperties(page);

  await openFirstProperty(page);
  await scrollToDocumentsSection(page);

  await expect(
    page.getByRole("heading", { name: "Documentación del inquilino" }),
  ).toBeVisible();
  await expect(page.getByText("Seleccionar archivo")).toBeVisible();
  await expect(page.getByText("Historial de análisis")).toBeVisible();
});
