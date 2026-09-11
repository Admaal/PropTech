import { test, expect } from "@playwright/test";
import {
  expectDashboardWithProperties,
  loginManual,
  openFirstProperty,
  scrollToDocumentsSection,
} from "./helpers/demo-login";

const demoPassword = process.env.DEMO_USER_PASSWORD ?? "";

const demoAccounts = [
  { id: "demo-a", label: "Demo A — Inmobiliaria Centro" },
  { id: "demo-b", label: "Demo B — Gestión Norte" },
] as const;

test.beforeEach(({}, testInfo) => {
  test.skip(!demoPassword, "Define DEMO_USER_PASSWORD para E2E smoke");
  test.skip(testInfo.project.name !== "chromium", "Smoke solo en Chromium");
});

for (const account of demoAccounts) {
  test(`login con ${account.id} muestra carga y llega al dashboard`, async ({
    page,
  }) => {
    await page.goto("/login");

    const accountButton = page.getByRole("button", {
      name: account.label,
      exact: true,
    });
    await expect(accountButton).toBeEnabled({ timeout: 30_000 });

    let loginRequests = 0;
    let releaseLogin!: () => void;
    const loginPaused = new Promise<void>((resolve) => {
      releaseLogin = resolve;
    });

    await page.route("**/api/demo-login", async (route) => {
      loginRequests += 1;
      await loginPaused;
      await route.continue();
    });

    const clickPromise = accountButton.click({ clickCount: 2 });
    await expect(accountButton).toHaveAttribute("aria-busy", "true");
    await expect(accountButton).toContainText("Accediendo…");
    releaseLogin();
    await clickPromise;
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
    expect(loginRequests).toBe(1);
    await expectDashboardWithProperties(page);
  });
}

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
