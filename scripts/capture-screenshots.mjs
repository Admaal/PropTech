/**
 * Captura 3 screenshots para el README.
 * Uso: node scripts/capture-screenshots.mjs
 * Requiere: DEMO_USER_PASSWORD en .env, playwright chromium instalado.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const outDir = join(root, "docs", "screenshots");
const baseURL =
  process.env.E2E_BASE_URL?.replace(/\/$/, "") ??
  "https://proptech-web-kappa.vercel.app";

const env = Object.fromEntries(
  readFileSync(join(root, ".env"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const password = env.DEMO_USER_PASSWORD;
if (!password) {
  console.error("Falta DEMO_USER_PASSWORD en .env");
  process.exit(1);
}

const samplePdf = join(root, "e2e", "fixtures", "sample.pdf");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

try {
  await page.goto(`${baseURL}/login`);
  await page
    .getByRole("button", { name: /Demo A — Inmobiliaria Centro/i })
    .click();
  await page.waitForURL(/\/dashboard/, { timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: join(outDir, "dashboard-mapa.png"),
    fullPage: false,
  });
  console.log("✓ dashboard-mapa.png");

  const firstProperty = page.locator('a[href^="/properties/"]').first();
  await firstProperty.waitFor({ state: "visible", timeout: 15000 });
  await firstProperty.click();
  await page.waitForURL("**/properties/**", { timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: join(outDir, "propiedad-analisis.png"),
    fullPage: false,
  });
  console.log("✓ propiedad-analisis.png");

  await page
    .getByRole("heading", { name: "Documentación del inquilino" })
    .scrollIntoViewIfNeeded();

  const fileInput = page.locator('input[type="file"][accept="application/pdf"]');
  await fileInput.setInputFiles(samplePdf, { force: true });

  const uploadNotice = page.getByText(
    /Documento recibido|Analizando con IA|Análisis completado|Límite diario/i,
  );
  try {
    await uploadNotice.first().waitFor({ timeout: 20000 });
  } catch {
    console.warn("Aviso de subida no visible; usando historial existente si hay.");
  }

  try {
    await page
      .getByText(/Análisis completado|Completado/i)
      .first()
      .waitFor({ timeout: 90000 });
  } catch {
    const historyToggle = page
      .locator("section")
      .filter({ hasText: "Historial de análisis" })
      .getByRole("button")
      .first();
    if (await historyToggle.isVisible()) {
      await historyToggle.click();
      await page.waitForTimeout(1500);
    }
  }

  await page.waitForTimeout(1000);
  await page.screenshot({
    path: join(outDir, "upload-pdf.png"),
    fullPage: false,
  });
  console.log("✓ upload-pdf.png");
} finally {
  await browser.close();
}

console.log(`Capturas guardadas en ${outDir}`);
