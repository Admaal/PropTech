/**
 * Lista modelos disponibles para tu API key.
 * node scripts/list-gemini-models.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "../.env"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const apiKey = env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY no encontrada en .env");
  process.exit(1);
}

const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
);
const body = await res.json();

if (!res.ok) {
  console.error("Error:", body);
  process.exit(1);
}

const models = (body.models ?? [])
  .filter((m) =>
    m.supportedGenerationMethods?.includes("generateContent"),
  )
  .map((m) => m.name.replace("models/", ""))
  .sort();

console.log("Modelos con generateContent:\n");
for (const name of models) {
  console.log(`  - ${name}`);
}
