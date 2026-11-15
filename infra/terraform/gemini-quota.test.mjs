import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const quotaTf = await readFile(new URL("./gemini-quota.tf", import.meta.url), "utf8");
const variablesTf = await readFile(new URL("./variables.tf", import.meta.url), "utf8");

assert.match(
  quotaTf,
  /resource\s+"google_project_service"\s+"cloud_quotas"/,
  "la API Cloud Quotas debe declararse en Terraform",
);
assert.match(quotaTf, /service\s*=\s*"cloudquotas\.googleapis\.com"/);

assert.match(
  quotaTf,
  /resource\s+"google_cloud_quotas_quota_preference"/,
  "el tope debe ser una preferencia de cuota de Cloud Quotas",
);
assert.match(quotaTf, /service\s*=\s*"generativelanguage\.googleapis\.com"/);

// Límites diarios por proyecto y modelo, en los tiers que sí tienen tope definido.
for (const quotaId of [
  "GenerateRequestsPerDayPerProjectPerModel-FreeTier",
  "GenerateRequestsPerDayPerProjectPerModel-PaidTier2",
]) {
  assert.match(quotaTf, new RegExp(`"${quotaId}"`), `falta el quota_id ${quotaId}`);
}

// Tier 3 queda fuera: su límite es ilimitado y el preference exige email de contacto.
assert.doesNotMatch(
  quotaTf,
  /PaidTier3/,
  "el tier 3 no debe estar en el tope (exige email de contacto)",
);

for (const model of [
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-2.5-flash-lite",
]) {
  assert.match(quotaTf, new RegExp(`"${model}"`), `falta el modelo ${model}`);
}

assert.match(quotaTf, /preferred_value\s*=\s*var\.gemini_daily_request_cap/);
assert.match(quotaTf, /dimensions\s*=\s*\{[\s\S]*?model\s*=/);

// Solo se ignora la comprobación de recorte porcentual; la de "por debajo del uso" sigue activa.
assert.match(
  quotaTf,
  /ignore_safety_checks\s*=\s*"QUOTA_DECREASE_PERCENTAGE_TOO_HIGH"/,
  "debe ignorar solo la comprobación de recorte porcentual",
);

assert.match(
  variablesTf,
  /variable\s+"gemini_daily_request_cap"[\s\S]*?default\s*=\s*150/,
  "el tope por defecto debe ser 150 peticiones al día",
);
