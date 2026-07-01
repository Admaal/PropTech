import { expect, type Page } from "@playwright/test";

export async function loginManual(
  page: Page,
  email: string,
  password: string,
) {
  await page.goto("/login");
  await page.getByText("Iniciar sesión manualmente").click();
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
}

export async function expectDashboardWithProperties(page: Page) {
  await expect(page.getByText(/\d+ inmuebles? encontrados/)).toBeVisible({
    timeout: 30_000,
  });
}

export async function openFirstProperty(page: Page) {
  const firstProperty = page.locator('a[href^="/properties/"]').first();
  await expect(firstProperty).toBeVisible({ timeout: 15_000 });
  await firstProperty.click();
  await expect(page).toHaveURL(/\/properties\//, { timeout: 15_000 });
}

export async function scrollToDocumentsSection(page: Page) {
  await page
    .getByRole("heading", { name: "Documentación del inquilino" })
    .scrollIntoViewIfNeeded();
}
